-- Preserva referências históricas da operação.
--
-- A baseline inicial da Issue #64 usou ON DELETE SET NULL em algumas FKs.
-- Para entregas e auditoria isso não é desejável: apagar um motoboy ou
-- colaborador não deve apagar silenciosamente "quem fez o quê".
-- Esses cadastros já possuem coluna ativo, então registros referenciados
-- devem ser desativados em vez de excluídos.

begin;

alter table entregas
  drop constraint if exists entregas_motoboy_id_fkey,
  add constraint entregas_motoboy_id_fkey
    foreign key (motoboy_id) references motoboys(id);

alter table entregas
  drop constraint if exists entregas_caixa_id_fkey,
  add constraint entregas_caixa_id_fkey
    foreign key (caixa_id) references colaboradores(id);

alter table entregas
  drop constraint if exists entregas_cadastrado_por_fkey,
  add constraint entregas_cadastrado_por_fkey
    foreign key (cadastrado_por) references colaboradores(id);

alter table entrega_anexos
  drop constraint if exists entrega_anexos_capturado_por_fkey,
  add constraint entrega_anexos_capturado_por_fkey
    foreign key (capturado_por) references colaboradores(id);

alter table entrega_historico
  drop constraint if exists entrega_historico_alterado_por_fkey,
  add constraint entrega_historico_alterado_por_fkey
    foreign key (alterado_por) references colaboradores(id);

alter table entrega_historico
  drop constraint if exists entrega_historico_alterado_por_motoboy_fkey,
  add constraint entrega_historico_alterado_por_motoboy_fkey
    foreign key (alterado_por_motoboy) references motoboys(id);

commit;
