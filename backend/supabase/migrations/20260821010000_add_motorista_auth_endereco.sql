-- ---------------------------------------------------------------------------
-- Prepara o schema para o app do motorista (ver Issue #5, sub-issue #28).
--
-- 1. `motoboys.telefone` + `motoboys.pin_hash`: base de acesso do futuro
--    login do motorista terceirizado — telefone identifica o motorista,
--    pin_hash guarda só o hash do PIN (nunca o PIN em texto puro; o hash é
--    gerado no servidor com scrypt + salt aleatório, ver
--    frontend/src/lib/motorista-auth.ts). Ambas as colunas ficam opcionais
--    porque motoristas já cadastrados não têm telefone/PIN até serem
--    editados na tela de Motoristas.
-- 2. `entregas.endereco`: hoje não existe nenhum jeito de saber pra onde o
--    motorista deve ir — texto livre, como `cliente_nome`, preenchido no
--    wizard "Adicionar Entrega" e na tela "Editar Entrega".
-- ---------------------------------------------------------------------------

alter table motoboys
  add column telefone text unique,
  add column pin_hash text;

alter table entregas
  add column endereco text;
