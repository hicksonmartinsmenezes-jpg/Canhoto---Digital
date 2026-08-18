-- Canhoto Interno — schema inicial
-- Baseado no modelo de dados definido no projeto (claude/modelo-de-dados-site.md)
-- Escopo: fluxo interno de recebimento de documentos (funcionário assina -> setor responsável arquiva)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------------

create type papel_colaborador as enum ('admin', 'gestor_setor', 'colaborador');

create type status_canhoto as enum ('pendente', 'recebido', 'devolvido', 'cancelado');

create type forma_comprovacao as enum ('assinatura_tela', 'foto', 'canhoto_fisico_digitalizado');

create type tipo_anexo as enum ('assinatura', 'foto', 'scan_canhoto_fisico');

-- ---------------------------------------------------------------------------
-- setores
-- ---------------------------------------------------------------------------

create table setores (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- colaboradores
-- Pessoas da empresa: quem recebe/assina canhotos e/ou usa o sistema.
-- id é o mesmo da auth.users do Supabase quando o colaborador tem login.
-- ---------------------------------------------------------------------------

create table colaboradores (
  id          uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  nome        text not null,
  email       text unique,
  setor_id    uuid references setores(id) on delete set null,
  cargo       text,
  papel       papel_colaborador not null default 'colaborador',
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create index idx_colaboradores_setor on colaboradores(setor_id);

-- ---------------------------------------------------------------------------
-- tipos_documento
-- ---------------------------------------------------------------------------

create table tipos_documento (
  id      uuid primary key default gen_random_uuid(),
  nome    text not null unique,
  ativo   boolean not null default true
);

insert into tipos_documento (nome) values
  ('Nota Fiscal'), ('Contrato'), ('Memorando'), ('Ordem de Serviço'),
  ('Requisição'), ('Recibo'), ('Outro');

-- ---------------------------------------------------------------------------
-- canhotos — entidade central
-- Fluxo de duas etapas: assinatura (responsavel_id) -> arquivamento (setor_id)
-- ---------------------------------------------------------------------------

create sequence canhotos_numero_seq start 1;

create table canhotos (
  id                  uuid primary key default gen_random_uuid(),
  numero              integer not null default nextval('canhotos_numero_seq') unique,
  tipo_documento_id    uuid not null references tipos_documento(id),
  numero_documento     text,
  setor_id             uuid not null references setores(id),        -- setor responsável pelo arquivamento
  responsavel_id       uuid not null references colaboradores(id),   -- quem recebeu e assinou
  data_emissao         date,
  data_assinatura      timestamptz,        -- quando o funcionário assinou o recebimento
  prazo_arquivamento   timestamptz,        -- prazo para o setor responsável arquivar
  data_arquivamento    timestamptz,        -- quando o setor responsável de fato arquivou
  status               status_canhoto not null default 'pendente',
  forma_comprovacao    forma_comprovacao,
  observacoes          text,
  cadastrado_por       uuid references colaboradores(id),
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now()
);

create index idx_canhotos_setor on canhotos(setor_id);
create index idx_canhotos_responsavel on canhotos(responsavel_id);
create index idx_canhotos_status on canhotos(status);
create index idx_canhotos_data_assinatura on canhotos(data_assinatura);
create index idx_canhotos_prazo_arquivamento on canhotos(prazo_arquivamento);

-- "Vencido" é um alerta calculado, não um status:
-- status = 'recebido' AND data_arquivamento IS NULL AND prazo_arquivamento < now()
create view canhotos_vencidos as
  select * from canhotos
  where status = 'recebido'
    and data_arquivamento is null
    and prazo_arquivamento is not null
    and prazo_arquivamento < now();

-- ---------------------------------------------------------------------------
-- canhoto_anexos — evidências (assinatura, foto, scan) + metadados Decreto 10.278
-- ---------------------------------------------------------------------------

create table canhoto_anexos (
  id             uuid primary key default gen_random_uuid(),
  canhoto_id     uuid not null references canhotos(id) on delete cascade,
  tipo           tipo_anexo not null,
  arquivo_url    text not null,
  capturado_em   timestamptz not null default now(),
  capturado_por  uuid references colaboradores(id),
  local_captura  text
);

create index idx_canhoto_anexos_canhoto on canhoto_anexos(canhoto_id);

-- ---------------------------------------------------------------------------
-- canhoto_historico — trilha de auditoria de mudança de status
-- ---------------------------------------------------------------------------

create table canhoto_historico (
  id              uuid primary key default gen_random_uuid(),
  canhoto_id      uuid not null references canhotos(id) on delete cascade,
  status_anterior status_canhoto,
  status_novo     status_canhoto not null,
  alterado_por    uuid references colaboradores(id),
  alterado_em     timestamptz not null default now(),
  observacao      text
);

create index idx_canhoto_historico_canhoto on canhoto_historico(canhoto_id);

-- Trigger: toda mudança de status em `canhotos` grava uma linha em canhoto_historico
-- e atualiza `atualizado_em` automaticamente.
create or replace function fn_registrar_historico_canhoto()
returns trigger as $$
begin
  new.atualizado_em := now();
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into canhoto_historico (canhoto_id, status_anterior, status_novo, alterado_por)
    values (new.id, old.status, new.status, new.cadastrado_por);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_canhotos_historico
  before update on canhotos
  for each row
  execute function fn_registrar_historico_canhoto();

-- ---------------------------------------------------------------------------
-- Row Level Security — habilitada, políticas a refinar conforme o papel
-- (admin / gestor_setor / colaborador) definido nas regras de negócio.
-- Por enquanto: qualquer usuário autenticado pode ler; ajustar antes de produção.
-- ---------------------------------------------------------------------------

alter table setores enable row level security;
alter table colaboradores enable row level security;
alter table tipos_documento enable row level security;
alter table canhotos enable row level security;
alter table canhoto_anexos enable row level security;
alter table canhoto_historico enable row level security;

create policy "leitura autenticada - setores" on setores for select using (auth.role() = 'authenticated');
create policy "leitura autenticada - colaboradores" on colaboradores for select using (auth.role() = 'authenticated');
create policy "leitura autenticada - tipos_documento" on tipos_documento for select using (auth.role() = 'authenticated');
create policy "leitura autenticada - canhotos" on canhotos for select using (auth.role() = 'authenticated');
create policy "leitura autenticada - canhoto_anexos" on canhoto_anexos for select using (auth.role() = 'authenticated');
create policy "leitura autenticada - canhoto_historico" on canhoto_historico for select using (auth.role() = 'authenticated');

-- TODO: políticas de escrita (insert/update/delete) por papel — definir quando
-- as regras de permissão por papel (admin/gestor_setor/colaborador) forem fechadas.
