// Vínculo da entrega com o documento da venda (pedido ou NF-e). O comprovante
// só serve como prova se der para ligá-lo à venda que o originou.

export const MENSAGEM_SEM_VINCULO =
  "Informe o número do pedido ou da NF-e. Sem um deles, o comprovante não fica ligado à venda.";

export const MENSAGEM_VINCULO_APAGADO =
  "Não é possível apagar o número do pedido e da NF-e de uma entrega já cadastrada.";

export interface DadosVinculoFiscal {
  numeroPedido: string;
  numeroNfe: string;
  /** Venda a consumidor final: não tem NF-e, mas precisa do pedido. */
  clienteFinal: boolean;
}

/** true quando a entrega tem pedido ou NF-e preenchidos. */
export function temVinculoFiscal(dados: DadosVinculoFiscal): boolean {
  const pedido = dados.numeroPedido.trim();
  const nfe = dados.clienteFinal ? "" : dados.numeroNfe.trim();
  return pedido.length > 0 || nfe.length > 0;
}

/**
 * Na edição, entregas antigas sem pedido nem NF-e continuam editáveis (o
 * número pode ter se perdido), mas quem já tem vínculo não pode perdê-lo.
 */
export function vinculoFoiApagado(
  atual: { numeroPedido: string | null; numeroNfe: string | null },
  novo: DadosVinculoFiscal
): boolean {
  const tinha = Boolean(atual.numeroPedido?.trim() || atual.numeroNfe?.trim());
  return tinha && !temVinculoFiscal(novo);
}
