-- Issue #72 — última localização conhecida do motorista
--
-- Guarda apenas a posição mais recente compartilhada pelo navegador do
-- motorista. Não é trilha histórica nem rastreamento contínuo.

begin;

create table motoboy_localizacoes (
  motoboy_id       uuid primary key references motoboys(id) on delete cascade,
  latitude         numeric(9,6) not null,
  longitude        numeric(9,6) not null,
  precisao_metros  numeric(10,2),
  atualizado_em    timestamptz not null default now(),
  constraint ck_motoboy_localizacao_latitude
    check (latitude between -90 and 90),
  constraint ck_motoboy_localizacao_longitude
    check (longitude between -180 and 180),
  constraint ck_motoboy_localizacao_precisao
    check (precisao_metros is null or precisao_metros >= 0)
);

create index idx_motoboy_localizacoes_atualizado
  on motoboy_localizacoes(atualizado_em);

commit;
