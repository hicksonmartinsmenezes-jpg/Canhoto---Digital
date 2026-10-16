-- 0016: rota com várias paradas.
--
-- O motorista pode juntar duas ou mais entregas aguardando saída numa rota e
-- iniciá-las de uma vez. As entregas da mesma rota compartilham o rota_id e
-- guardam a posição na ordem de visita (rota_ordem, 1 = primeira parada).
-- Entregas soltas continuam com as duas colunas vazias.

begin;

alter table entregas
  add column if not exists rota_id uuid,
  add column if not exists rota_ordem smallint;

create index if not exists idx_entregas_rota
  on entregas(rota_id)
  where rota_id is not null;

commit;
