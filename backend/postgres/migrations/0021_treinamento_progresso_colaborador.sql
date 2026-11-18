-- Colaboradores (gestor_setor) também fazem os treinamentos: o progresso passa
-- a poder pertencer a um colaborador, além de um usuário Admin.

begin;

alter table treinamento_progresso
  alter column usuario_admin_id drop not null;

alter table treinamento_progresso
  add column if not exists colaborador_id uuid
    references colaboradores(id) on delete cascade;

alter table treinamento_progresso
  drop constraint if exists ck_treinamento_progresso_dono;
alter table treinamento_progresso
  add constraint ck_treinamento_progresso_dono
    check ((usuario_admin_id is null) <> (colaborador_id is null));

create unique index if not exists treinamento_progresso_colaborador_slug_key
  on treinamento_progresso (colaborador_id, treinamento_slug)
  where colaborador_id is not null;

create index if not exists idx_treinamento_progresso_colaborador
  on treinamento_progresso (colaborador_id);

commit;
