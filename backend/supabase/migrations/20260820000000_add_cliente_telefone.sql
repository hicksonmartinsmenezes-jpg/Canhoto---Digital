-- ---------------------------------------------------------------------------
-- Adiciona telefone de contato do cliente na entrega.
--
-- O formulário "Adicionar Entrega" deixa de ter um campo manual de "Hora de
-- Saída" — esse horário passa a ser definido automaticamente pelo futuro
-- app do motoboy (quando ele iniciar a corrida), não mais digitado por quem
-- cadastra a entrega. A coluna `hora_saida` continua existindo (o app vai
-- gravar nela quando existir); só a edição manual saiu do Portal Web Admin.
-- No lugar, o formulário passa a coletar o telefone do cliente, útil para
-- contato na hora da entrega.
-- ---------------------------------------------------------------------------

alter table entregas
  add column cliente_telefone text;
