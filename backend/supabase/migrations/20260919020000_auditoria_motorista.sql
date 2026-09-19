-- Auditoria das ações executadas pelo motorista.
-- Mantém a trilha legada de entrega_historico para mudanças administrativas
-- e registra separadamente o ator real do fluxo do aplicativo.

create type tipo_evento_motorista as enum (
  'saida_iniciada',
  'comprovante_foto',
  'comprovante_assinatura',
  'entrega_confirmada',
  'observacao_atualizada'
);

create table entrega_eventos_motorista (
  id uuid primary key default gen_random_uuid(),
  entrega_id uuid not null references entregas(id) on delete cascade,
  motoboy_id uuid not null references motoboys(id) on delete restrict,
  tipo tipo_evento_motorista not null,
  criado_em timestamptz not null default now(),
  detalhes jsonb
);

create index idx_eventos_motorista_entrega
  on entrega_eventos_motorista(entrega_id, criado_em desc);

create index idx_eventos_motorista_motoboy
  on entrega_eventos_motorista(motoboy_id, criado_em desc);

alter table entrega_eventos_motorista enable row level security;
