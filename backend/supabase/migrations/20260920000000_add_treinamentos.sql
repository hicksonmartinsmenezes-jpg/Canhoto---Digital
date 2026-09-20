-- Central de treinamentos internos.
-- O conteúdo permanece versionado no frontend; o banco guarda só o
-- progresso individual do usuário autenticado.

create table treinamento_progresso (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  treinamento_slug text not null,
  status text not null default 'em_andamento'
    check (status in ('em_andamento', 'concluido')),
  iniciado_em timestamptz not null default now(),
  concluido_em timestamptz,
  atualizado_em timestamptz not null default now(),
  unique (usuario_id, treinamento_slug),
  check (treinamento_slug ~ '^[a-z0-9-]+$'),
  check (
    (status = 'concluido' and concluido_em is not null)
    or
    (status = 'em_andamento' and concluido_em is null)
  )
);

create index idx_treinamento_progresso_usuario
  on treinamento_progresso(usuario_id);

alter table treinamento_progresso enable row level security;

create policy "treinamento - ler proprio progresso"
  on treinamento_progresso
  for select
  using (auth.uid() = usuario_id);

create policy "treinamento - iniciar proprio progresso"
  on treinamento_progresso
  for insert
  with check (auth.uid() = usuario_id);

create policy "treinamento - atualizar proprio progresso"
  on treinamento_progresso
  for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);
