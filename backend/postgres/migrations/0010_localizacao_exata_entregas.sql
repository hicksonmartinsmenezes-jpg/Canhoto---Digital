-- Ponto exato opcional da entrega para navegação.
-- IF NOT EXISTS deixa a migration segura mesmo em um ambiente onde uma
-- tentativa anterior de geocodificação já tenha criado as colunas.

alter table entregas
  add column if not exists latitude numeric(9,6),
  add column if not exists longitude numeric(9,6);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ck_entregas_latitude'
  ) then
    alter table entregas
      add constraint ck_entregas_latitude
      check (latitude is null or latitude between -90 and 90);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ck_entregas_longitude'
  ) then
    alter table entregas
      add constraint ck_entregas_longitude
      check (longitude is null or longitude between -180 and 180);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ck_entregas_coordenadas_completas'
  ) then
    alter table entregas
      add constraint ck_entregas_coordenadas_completas
      check ((latitude is null) = (longitude is null));
  end if;
end $$;
