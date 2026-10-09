-- 0017: PDF da nota (DANFE) como anexo da entrega.
--
-- Ao cadastrar uma entrega é possível anexar o XML da NF-e (tipo xml_nfe, já
-- existente) e o PDF da nota. Este valor guarda o PDF.
--
-- ADD VALUE fica fora de transação de propósito (o valor novo só pode ser
-- usado depois do commit).

alter type tipo_anexo_entrega add value if not exists 'danfe_pdf';
