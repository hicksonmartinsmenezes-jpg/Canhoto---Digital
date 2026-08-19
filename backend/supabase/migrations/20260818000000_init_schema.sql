-- Canhoto Interno — schema v2 (entrega ao cliente externo)
-- Baseado no romaneio físico real da Expedição (claude/modelo-de-dados-site.md).
-- Substitui a v1 (fluxo interno funcionário-para-funcionário), descartada antes
-- de qualquer deploy real — sem dados em produção a preservar.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------------

create type papel_colaborador as enum ('admin', 'gestor_setor', 'colaborador');

create type status_entrega as enum ('pendente', 'entregue', 'cancelado');

create type forma_pagamento as enum ('dinheiro', 'pix', 'debito', 'cartao_1x', 'prazo');

create type tipo_anexo_entrega as enum ('xml_nfe', 'xml_cte', 'assinatura_cliente', 'foto');

-- ---------------------------------------------------------------------------
-- setores
-- Mantido no schema por flexibilidade futura, mas na prática só "Expedição"
-- opera o sistema de entregas hoje — não é uma tela de gestão no site.
-- ---------------------------------------------------------------------------

create table setores (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

insert into setores (nome) values ('Expedição');

-- ---------------------------------------------------------------------------
-- colaboradores
-- Pessoas da empresa: quem cadastra entregas, confere pagamento no caixa,
-- e/ou usa o sistema. id é o mesmo da auth.users do Supabase quando tem login.
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
-- motoboys
-- Entregadores terceirizados — não são colaboradores da empresa, não têm
-- login no sistema, só um cadastro leve de referência (nome no romaneio).
-- ---------------------------------------------------------------------------

create table motoboys (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- entregas — entidade central (antes "canhotos")
-- Fluxo: cadastro -> saída (motoboy) -> entrega confirmada (cliente) ->
-- conferência de caixa (quando a forma de pagamento é coletada na entrega).
-- ---------------------------------------------------------------------------

create sequence entregas_numero_seq start 1;

create table entregas (
  id                    uuid primary key default gen_random_uuid(),
  numero                integer not null default nextval('entregas_numero_seq') unique,
  data                  date not null default current_date,
  cliente_nome          text not null,          -- texto livre, como no romaneio (não é cadastro de clientes)
  numero_pedido         text,
  numero_nfe            text,
  valor_pagamento       numeric(12,2) not null,
  forma_pagamento       forma_pagamento not null,
  hora_saida            time,
  motoboy_id            uuid references motoboys(id),
  cliente_assinou_em    timestamptz,             -- confirmação de recebimento pelo cliente
  caixa_id              uuid references colaboradores(id),   -- quem conferiu o pagamento
  caixa_confirmou_em    timestamptz,
  status                status_entrega not null default 'pendente',
  observacoes           text,
  cadastrado_por        uuid references colaboradores(id),
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now()
);

create index idx_entregas_data on entregas(data);
create index idx_entregas_motoboy on entregas(motoboy_id);
create index idx_entregas_caixa on entregas(caixa_id);
create index idx_entregas_status on entregas(status);
create index idx_entregas_forma_pagamento on entregas(forma_pagamento);

-- "Pendente de conferência de caixa" é um alerta calculado, não um status:
-- entrega já confirmada pelo cliente, com pagamento coletado na entrega
-- (qualquer forma exceto "prazo"), mas o caixa ainda não conferiu o valor.
create view entregas_pendentes_conferencia as
  select * from entregas
  where status = 'entregue'
    and forma_pagamento <> 'prazo'
    and caixa_confirmou_em is null;

-- ---------------------------------------------------------------------------
-- entrega_anexos — XML da NF-e/CT-e enviado no cadastro, assinatura, fotos
-- ---------------------------------------------------------------------------

create table entrega_anexos (
  id             uuid primary key default gen_random_uuid(),
  entrega_id     uuid not null references entregas(id) on delete cascade,
  tipo           tipo_anexo_entrega not null,
  arquivo_url    text not null,
  capturado_em   timestamptz not null default now(),
  capturado_por  uuid references colaboradores(id)
);

create index idx_entrega_anexos_entrega on entrega_anexos(entrega_id);

-- ---------------------------------------------------------------------------
-- entrega_historico — trilha de auditoria de mudança de status
-- ---------------------------------------------------------------------------

create table entrega_historico (
  id              uuid primary key default gen_random_uuid(),
  entrega_id      uuid not null references entregas(id) on delete cascade,
  status_anterior status_entrega,
  status_novo     status_entrega not null,
  alterado_por    uuid references colaboradores(id),
  alterado_em     timestamptz not null default now(),
  observacao      text
);

create index idx_entrega_historico_entrega on entrega_historico(entrega_id);

-- Trigger: toda mudança de status em `entregas` grava uma linha em
-- entrega_historico e atualiza `atualizado_em` automaticamente.
create or replace function fn_registrar_historico_entrega()
returns trigger as $$
begin
  new.atualizado_em := now();
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into entrega_historico (entrega_id, status_anterior, status_novo, alterado_por)
    values (new.id, old.status, new.status, new.cadastrado_por);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_entregas_historico
  before update on entregas
  for each row
  execute function fn_registrar_historico_entrega();

-- ---------------------------------------------------------------------------
-- Row Level Security — habilitada, políticas a refinar conforme o papel
-- (admin / gestor_setor / colaborador) definido nas regras de negócio.
-- Por enquanto: qualquer usuário autenticado pode ler; ajustar antes de produção.
-- ---------------------------------------------------------------------------

alter table setores enable row level security;
alter table colaboradores enable row level security;
alter table motoboys enable row level security;
alter table entregas enable row level security;
alter table entrega_anexos enable row level security;
alter table entrega_historico enable row level security;

create policy "leitura autenticada - setores" on setores for select using (auth.role() = 'authenticated');
create policy "leitura autenticada - colaboradores" on colaboradores for select using (auth.role() = 'authenticated');
create policy "leitura autenticada - motoboys" on motoboys for select using (auth.role() = 'authenticated');
create policy "leitura autenticada - entregas" on entregas for select using (auth.role() = 'authenticated');
create policy "leitura autenticada - entrega_anexos" on entrega_anexos for select using (auth.role() = 'authenticated');
create policy "leitura autenticada - entrega_historico" on entrega_historico for select using (auth.role() = 'authenticated');

-- TODO: políticas de escrita (insert/update/delete) por papel — definir quando
-- as regras de permissão por papel (admin/gestor_setor/colaborador) forem fechadas.
