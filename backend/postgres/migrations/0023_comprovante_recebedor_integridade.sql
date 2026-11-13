-- Comprovante com validade jurídica: nome de quem recebeu a mercadoria e
-- impressão digital (SHA-256) de cada arquivo anexado, para provar que a foto
-- guardada não foi alterada depois da captura. Entregas antigas ficam com NULL.

begin;

alter table entregas
  add column if not exists recebedor_nome text;

alter table entrega_anexos
  add column if not exists sha256 char(64);

alter table entrega_anexos
  drop constraint if exists ck_entrega_anexos_sha256_formato;
alter table entrega_anexos
  add constraint ck_entrega_anexos_sha256_formato
  check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$');

commit;
