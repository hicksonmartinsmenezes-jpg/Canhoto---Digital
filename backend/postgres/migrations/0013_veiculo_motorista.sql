-- 0013: motorista responsável pelo veículo (opcional).
--
-- Antes não havia como saber qual motorista usa cada veículo da frota; os
-- gastos (combustível, manutenção) ficavam soltos. A coluna é opcional e,
-- se o motorista for excluído, o veículo fica sem responsável (set null).

begin;

alter table veiculos
  add column if not exists motoboy_id uuid references motoboys(id) on delete set null;

create index if not exists idx_veiculos_motoboy on veiculos(motoboy_id);

commit;
