// Impressão digital (SHA-256) dos arquivos do comprovante e código de
// verificação do documento. Funções puras: não acessam banco nem disco.

import { createHash } from "node:crypto";

export type SituacaoIntegridade =
  /** O arquivo guardado ainda tem a mesma impressão digital do envio. */
  | "conferido"
  /** O arquivo mudou depois do envio. */
  | "divergente"
  /** Anexo anterior ao registro de impressão digital. */
  | "sem_registro"
  /** O arquivo não foi encontrado no armazenamento. */
  | "arquivo_ausente";

export function sha256Hex(conteudo: Uint8Array): string {
  return createHash("sha256").update(conteudo).digest("hex");
}

export function situacaoIntegridade(
  registrado: string | null,
  atual: string | null
): SituacaoIntegridade {
  if (atual === null) return "arquivo_ausente";
  if (!registrado) return "sem_registro";
  return registrado.toLowerCase() === atual.toLowerCase()
    ? "conferido"
    : "divergente";
}

export interface DadosCodigoVerificacao {
  entregaId: string;
  recebedorNome: string;
  /** Empresa ou vínculo; só entra no código quando preenchido. */
  recebedorVinculo?: string | null;
  concluidaEm: string;
  motoboyNome: string;
  /** Impressões digitais dos anexos registradas no envio. */
  hashesAnexos: string[];
}

/**
 * Código que resume o ato da entrega: quem recebeu, quando, com quem e com
 * quais arquivos. Se qualquer um desses dados ou das imagens mudar, o código
 * muda — serve para conferir um comprovante impresso.
 *
 * Pedido e NF-e ficam de fora de propósito: a nota costuma ser emitida depois
 * do pagamento, que muitas vezes acontece na própria entrega, então o número
 * é preenchido depois da conclusão. Se entrasse no código, esse lançamento
 * normal faria o comprovante já impresso parecer adulterado. A ligação com a
 * venda fica registrada na entrega e no histórico, que não pode ser alterado.
 */
export function codigoVerificacao(dados: DadosCodigoVerificacao): string {
  const canonico = [
    dados.entregaId,
    dados.recebedorNome,
    ...(dados.recebedorVinculo ? [dados.recebedorVinculo] : []),
    new Date(dados.concluidaEm).toISOString(),
    dados.motoboyNome,
    ...[...dados.hashesAnexos].sort(),
  ].join("|");

  return createHash("sha256").update(canonico).digest("hex");
}
