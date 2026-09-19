-- Registra o usuário administrativo real quando não houver colaborador
-- vinculado à conta de login.

begin;

alter table entregas
  add column cadastrado_por_admin uuid references usuarios_admin(id);

alter table entrega_historico
  add column alterado_por_admin uuid references usuarios_admin(id);

alter table entrega_historico
  drop constraint if exists ck_historico_um_ator;

alter table entrega_historico
  add constraint ck_historico_um_ator
  check (
    num_nonnulls(
      alterado_por,
      alterado_por_motoboy,
      alterado_por_admin
    ) <= 1
  );

create index idx_entregas_cadastrado_por_admin
  on entregas(cadastrado_por_admin);

create index idx_entrega_historico_admin
  on entrega_historico(alterado_por_admin);

commit;
