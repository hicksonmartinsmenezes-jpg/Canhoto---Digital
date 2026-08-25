-- ---------------------------------------------------------------------------
-- Celular de contato do colaborador.
--
-- E-mail e celular passam a ser obrigatórios no cadastro/edição de
-- Colaboradores (validado na Server Action e no formulário, não travado
-- aqui como NOT NULL — a coluna `email` já existia nullable e `celular` é
-- nova, então travar no banco arriscaria quebrar alguma linha já
-- cadastrada sem os dois campos preenchidos). E-mail é pra onde vai o
-- convite/login do colaborador quando ele ganha acesso ao sistema (ver
-- Issue #48/PR #49, login do admin — ainda fora do escopo desta tela).
--
-- O campo de Setor sai do formulário: hoje só existe "Expedição" semeado
-- em `setores` (ver 20260821010000), então o cadastro passa a resolver
-- esse setor sozinho no servidor em vez de pedir pro admin digitar algo
-- que só tem uma resposta possível.
-- ---------------------------------------------------------------------------

alter table colaboradores
  add column celular text;
