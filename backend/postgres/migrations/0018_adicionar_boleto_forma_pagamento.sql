-- Adiciona "boleto" como forma de pagamento de entrega.
-- Antes, NF-e paga por boleto (código fiscal 15) era cadastrada como "prazo".

alter type forma_pagamento
  add value if not exists 'boleto';
