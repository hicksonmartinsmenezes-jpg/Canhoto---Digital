-- Marca entregas vendidas a consumidor final, que não têm NF-e cadastrada.
-- Essas entregas deixam de contar no alerta "sem número de NF-e" do Dashboard.

alter table entregas
  add column if not exists cliente_final boolean not null default false;
