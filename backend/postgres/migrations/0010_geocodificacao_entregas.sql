-- Geocodificação persistida das entregas.
-- O endereço continua sendo a informação exibida ao usuário; latitude e
-- longitude são usadas para abrir a navegação no ponto resolvido, evitando
-- que o Waze precise reinterpretar o texto a cada abertura.

alter table entregas
  add column latitude numeric(9,6),
  add column longitude numeric(9,6),
  add column geocodificacao_fonte text,
  add column geocodificado_em timestamp with time zone;

alter table entregas
  add constraint ck_entregas_latitude
    check (latitude is null or latitude between -90 and 90),
  add constraint ck_entregas_longitude
    check (longitude is null or longitude between -180 and 180),
  add constraint ck_entregas_coordenadas_completas
    check ((latitude is null) = (longitude is null));
