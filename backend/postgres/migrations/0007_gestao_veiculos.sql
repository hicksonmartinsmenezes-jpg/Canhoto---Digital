-- Issue #86 — Gestão de veículos e despesas da frota
--
-- Veículos são inativados em vez de apagados para preservar o histórico
-- financeiro. Cada despesa mantém o Admin responsável pelo lançamento.

begin;

create type tipo_gasto_veiculo as enum (
  'combustivel',
  'manutencao',
  'multa',
  'lava_jato',
  'pedagio',
  'outro'
);

create table veiculos (
  id            uuid primary key default gen_random_uuid(),
  placa         text not null unique,
  marca         text not null,
  modelo        text not null,
  ano           integer,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint ck_veiculos_placa
    check (placa ~ '^[A-Z0-9]{7}$'),
  constraint ck_veiculos_ano
    check (ano is null or ano between 1950 and 2100)
);

create index idx_veiculos_ativo
  on veiculos(ativo);

create table veiculo_gastos (
  id                    uuid primary key default gen_random_uuid(),
  veiculo_id            uuid not null references veiculos(id) on delete restrict,
  tipo                   tipo_gasto_veiculo not null,
  data                   date not null default current_date,
  valor                  numeric(12,2) not null,
  quilometragem          integer,
  observacao             text,
  cadastrado_por_admin   uuid references usuarios_admin(id) on delete set null,
  criado_em              timestamptz not null default now(),
  constraint ck_veiculo_gastos_valor
    check (valor > 0),
  constraint ck_veiculo_gastos_quilometragem
    check (quilometragem is null or quilometragem >= 0)
);

create index idx_veiculo_gastos_veiculo
  on veiculo_gastos(veiculo_id);

create index idx_veiculo_gastos_data
  on veiculo_gastos(data desc);

create index idx_veiculo_gastos_tipo
  on veiculo_gastos(tipo);

commit;
