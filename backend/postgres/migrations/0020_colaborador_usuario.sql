-- Login do painel por "Usuário" e "Senha": o colaborador (gestor de setor)
-- passa a entrar por um nome de usuário em vez do celular.
--
-- O usuário é gravado em minúsculas, sem espaços, e é único. Colaboradores
-- antigos ficam sem usuário (null) e só voltam a entrar depois que o admin
-- definir um na tela de Colaboradores.

alter table colaboradores
  add column if not exists usuario text;

create unique index if not exists colaboradores_usuario_key
  on colaboradores (usuario)
  where usuario is not null;
