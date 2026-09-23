-- Distingue a foto da entrega do comprovante de pagamento via Pix.
-- O tipo legado "foto" continua representando a foto da entrega para
-- preservar os anexos já existentes.

alter type tipo_anexo_entrega
  add value if not exists 'comprovante_pix';
