-- Registra a trilha de GPS usada para calcular a quilometragem percorrida
-- pelo motorista durante as entregas do dia.
--
-- motoboy_localizacoes continua guardando apenas a última posição conhecida.
-- Esta tabela mantém os pontos históricos associados à entrega em rota.

begin;

create table motoboy_localizacao_historico (
  id               uuid primary key default gen_random_uuid(),
  motoboy_id       uuid not null references motoboys(id) on delete cascade,
  entrega_id       uuid not null references entregas(id) on delete cascade,
  latitude         numeric(9,6) not null,
  longitude        numeric(9,6) not null,
  precisao_metros  numeric(10,2),
  registrado_em    timestamptz not null default now(),

  constraint ck_motoboy_localizacao_historico_latitude
    check (latitude between -90 and 90),
  constraint ck_motoboy_localizacao_historico_longitude
    check (longitude between -180 and 180),
  constraint ck_motoboy_localizacao_historico_precisao
    check (precisao_metros is null or precisao_metros >= 0)
);

create index idx_motoboy_localizacao_historico_motoboy
  on motoboy_localizacao_historico(motoboy_id, registrado_em);

create index idx_motoboy_localizacao_historico_entrega
  on motoboy_localizacao_historico(entrega_id, registrado_em);

commit;
