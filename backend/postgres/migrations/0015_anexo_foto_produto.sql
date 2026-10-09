-- 0015: foto do produto (opcional) no comprovante de entrega.
--
-- O motorista passa a poder anexar, além da foto da entrega, uma foto do
-- produto entregue. A assinatura do cliente deixou de ser coletada, mas o
-- valor 'assinatura_cliente' continua no tipo para não perder as já gravadas.
--
-- ADD VALUE fica fora de transação de propósito (o valor novo só pode ser
-- usado depois do commit).

alter type tipo_anexo_entrega add value if not exists 'foto_produto';
