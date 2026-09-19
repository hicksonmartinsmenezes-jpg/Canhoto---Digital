-- Canhoto Digital — baseline PostgreSQL local
-- Issue #64
--
-- Esta baseline consolida as migrations legadas do Supabase em um schema
-- PostgreSQL puro. O banco novo começa vazio, portanto não há dados de
-- produção a preservar durante esta migração.
--
-- Removido por ser específico do Supabase:
--   - auth.users
--   - auth.role()
--   - policies/RLS baseadas no Supabase Auth
--   - service_role
--
-- A autorização passa a ser responsabilidade da aplicação Next.js e das
-- transações/queries do Drizzle. RLS poderá ser reavaliada futuramente,
-- quando houver uma estratégia de identidade PostgreSQL própria.

begin;

create extension if not exists "pgcrypto";

create type papel_colaborador as enum ('admin', 'gestor_setor', 'colaborador');
create type status_entrega as enum ('pendente', 'entregue', 'cancelado');
create type forma_pagamento as enum ('dinheiro', 'pix', 'debito', 'cartao_1x', 'prazo');
create type tipo_anexo_entrega as enum ('xml_nfe', 'xml_cte', 'assinatura_cliente', 'foto');

create table setores (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

insert into setores (nome) values ('Expedição');

create table colaboradores (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  email       text unique,
  celular     text,
  setor_id    uuid references setores(id) on delete set null,
  cargo       text,
  papel       papel_colaborador not null default 'colaborador',
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create index idx_colaboradores_setor on colaboradores(setor_id);

create table usuarios_admin (
  id              uuid primary key default gen_random_uuid(),
  colaborador_id  uuid unique references colaboradores(id) on delete set null,
  email           text not null unique,
  senha_hash      text not null,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

create index idx_usuarios_admin_ativo on usuarios_admin(ativo);

create table motoboys (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  telefone    text unique,
  pin_hash    text,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create sequence entregas_numero_seq start 1;

create table entregas (
  id                    uuid primary key default gen_random_uuid(),
  numero                integer not null default nextval('entregas_numero_seq') unique,
  data                  date not null default current_date,
  cliente_nome          text not null,
  cliente_telefone      text,
  endereco              text,
  numero_pedido         text,
  numero_nfe            text,
  valor_pagamento       numeric(12,2) not null,
  forma_pagamento       forma_pagamento not null,
  hora_saida            time,
  motoboy_id            uuid references motoboys(id) on delete set null,
  cliente_assinou_em    timestamptz,
  caixa_id              uuid references colaboradores(id) on delete set null,
  caixa_confirmou_em    timestamptz,
  status                status_entrega not null default 'pendente',
  observacoes           text,
  cadastrado_por        uuid references colaboradores(id) on delete set null,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now()
);

create index idx_entregas_data on entregas(data);
create index idx_entregas_motoboy on entregas(motoboy_id);
create index idx_entregas_caixa on entregas(caixa_id);
create index idx_entregas_status on entregas(status);
create index idx_entregas_forma_pagamento on entregas(forma_pagamento);

create view entregas_pendentes_conferencia as
  select *
  from entregas
  where status = 'entregue'
    and forma_pagamento <> 'prazo'
    and caixa_confirmou_em is null;

create table entrega_anexos (
  id             uuid primary key default gen_random_uuid(),
  entrega_id     uuid not null references entregas(id) on delete cascade,
  tipo           tipo_anexo_entrega not null,
  arquivo_url    text not null,
  capturado_em   timestamptz not null default now(),
  capturado_por  uuid references colaboradores(id) on delete set null
);

create index idx_entrega_anexos_entrega on entrega_anexos(entrega_id);

create table entrega_historico (
  id                    uuid primary key default gen_random_uuid(),
  entrega_id            uuid not null references entregas(id) on delete cascade,
  status_anterior       status_entrega,
  status_novo           status_entrega not null,
  alterado_por          uuid references colaboradores(id) on delete set null,
  alterado_por_motoboy  uuid references motoboys(id) on delete set null,
  alterado_em           timestamptz not null default now(),
  observacao            text,
  constraint ck_historico_um_ator
    check (
      not (
        alterado_por is not null
        and alterado_por_motoboy is not null
      )
    )
);

create index idx_entrega_historico_entrega on entrega_historico(entrega_id);
create index idx_entrega_historico_colaborador on entrega_historico(alterado_por);
create index idx_entrega_historico_motoboy on entrega_historico(alterado_por_motoboy);

create or replace function fn_atualizar_timestamp_entrega()
returns trigger as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$ language plpgsql;

create trigger trg_entregas_atualizado_em
  before update on entregas
  for each row
  execute function fn_atualizar_timestamp_entrega();

create or replace function fn_atualizar_timestamp_usuario_admin()
returns trigger as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$ language plpgsql;

create trigger trg_usuarios_admin_atualizado_em
  before update on usuarios_admin
  for each row
  execute function fn_atualizar_timestamp_usuario_admin();

commit;
