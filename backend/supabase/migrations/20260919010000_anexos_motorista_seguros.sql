-- Anexos seguros do aplicativo do motorista.
-- O bucket permanece privado e os arquivos só são manipulados pelo servidor.
-- O motorista autenticado é registrado separadamente de colaboradores.

alter table entrega_anexos
  add column if not exists capturado_por_motoboy_id uuid
    references motoboys(id) on delete set null,
  add column if not exists request_id uuid;

create unique index if not exists ux_entrega_anexos_request_id
  on entrega_anexos(request_id)
  where request_id is not null;

create index if not exists idx_entrega_anexos_motoboy
  on entrega_anexos(capturado_por_motoboy_id);

insert into storage.buckets (id, name, public)
values ('entrega-anexos', 'entrega-anexos', false)
on conflict (id) do update set public = false;

comment on column entrega_anexos.capturado_por_motoboy_id is
  'Motorista autenticado que capturou o anexo. Nao recebe valor do cliente.';

comment on column entrega_anexos.request_id is
  'Chave de idempotencia da operacao de upload.';
