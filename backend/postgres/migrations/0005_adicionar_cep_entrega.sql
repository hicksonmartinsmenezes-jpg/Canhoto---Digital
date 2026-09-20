-- Issue #70 — CEP próprio da entrega
--
-- Mantém o endereço em texto livre e armazena o CEP normalizado apenas com
-- 8 dígitos. Entregas antigas continuam válidas com CEP nulo.

begin;

alter table entregas
  add column cep text;

alter table entregas
  add constraint ck_entregas_cep
  check (
    cep is null
    or cep ~ '^[0-9]{8}$'
  );

commit;
