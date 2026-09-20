-- Issue #88 — Central de treinamentos internos
--
-- O conteúdo dos treinamentos fica versionado no código. O banco armazena
-- somente o progresso por usuário Admin, evitando duplicar conteúdo editorial.

begin;

create type status_treinamento as enum (
  'em_andamento',
  'concluido'
);

create table treinamento_progresso (
  id                uuid primary key default gen_random_uuid(),
  usuario_admin_id  uuid not null references usuarios_admin(id) on delete cascade,
  treinamento_slug  text not null,
  status             status_treinamento not null default 'em_andamento',
  iniciado_em        timestamptz not null default now(),
  concluido_em       timestamptz,
  atualizado_em      timestamptz not null default now(),
  constraint treinamento_progresso_usuario_slug_key
    unique (usuario_admin_id, treinamento_slug),
  constraint ck_treinamento_progresso_slug
    check (treinamento_slug ~ '^[a-z0-9-]+$'),
  constraint ck_treinamento_progresso_conclusao
    check (
      (status = 'concluido' and concluido_em is not null)
      or
      (status = 'em_andamento' and concluido_em is null)
    )
);

create index idx_treinamento_progresso_usuario
  on treinamento_progresso(usuario_admin_id);

create index idx_treinamento_progresso_status
  on treinamento_progresso(status);

commit;
