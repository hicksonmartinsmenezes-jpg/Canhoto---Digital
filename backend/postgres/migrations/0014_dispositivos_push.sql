-- Celulares dos motoristas que aceitaram receber notificações (push do app).
-- O token identifica o aparelho; se o mesmo celular entrar com outro motorista,
-- o token passa para ele (token é único).
begin;

create table if not exists dispositivos_push (
  id            uuid primary key default gen_random_uuid(),
  motoboy_id    uuid not null references motoboys(id) on delete cascade,
  token         text not null unique,
  plataforma    text not null default 'android',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint ck_dispositivos_push_token check (length(token) between 20 and 4096)
);

create index if not exists idx_dispositivos_push_motoboy
  on dispositivos_push(motoboy_id);

commit;
