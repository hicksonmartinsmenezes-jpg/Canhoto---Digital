-- Issue #68 — auditoria dos comprovantes capturados pelo motorista
--
-- entrega_anexos já registrava colaborador em capturado_por, mas o fluxo
-- mobile precisa preservar o motoboy real que enviou foto/assinatura.

begin;

alter table entrega_anexos
  add column capturado_por_motoboy uuid references motoboys(id) on delete set null;

alter table entrega_anexos
  add constraint ck_entrega_anexos_um_ator
  check (
    num_nonnulls(
      capturado_por,
      capturado_por_motoboy
    ) <= 1
  );

create index idx_entrega_anexos_motoboy
  on entrega_anexos(capturado_por_motoboy);

commit;
