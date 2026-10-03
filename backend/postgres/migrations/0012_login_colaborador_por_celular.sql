-- Issue: login do colaborador (papel gestor_setor) passa a usar celular em
-- vez de e-mail. O painel de Colaboradores não coleta mais e-mail no
-- cadastro, então o celular vira o identificador único usado em
-- /colaborador/login (ver @/app/colaborador/login/actions.ts).
--
-- A constraint de unicidade em "email" (0001_baseline.sql) é mantida por
-- compatibilidade com registros antigos — não é removida aqui.
--
-- ATENÇÃO antes de aplicar: um índice único do Postgres permite múltiplos
-- valores NULL (não conflita), mas falha se já existir mais de um
-- colaborador com o MESMO celular preenchido. Se este ALTER TABLE falhar
-- por duplicidade, rode antes:
--   select celular, count(*) from colaboradores
--   where celular is not null group by celular having count(*) > 1;
-- e resolva os duplicados (edite um deles) antes de tentar de novo.

alter table colaboradores
  add constraint colaboradores_celular_key unique (celular);
