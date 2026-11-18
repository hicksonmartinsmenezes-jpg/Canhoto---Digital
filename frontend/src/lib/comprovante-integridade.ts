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
  numeroPedido: string;
  numeroNfe: string;
  recebedorNome: string;
  concluidaEm: string;
  motoboyNome: string;
  /** Impressões digitais dos anexos registradas no envio. */
  hashesAnexos: string[];
}

/**
 * Código que resume os dados do comprovante. Se qualquer campo ou arquivo
 * mudar, o código muda — serve para conferir um comprovante impresso.
 */
export function codigoVerificacao(dados: DadosCodigoVerificacao): string {
  const canonico = [
    dados.entregaId,
    dados.numeroPedido,
    dados.numeroNfe,
    dados.recebedorNome,
    new Date(dados.concluidaEm).toISOString(),
    dados.motoboyNome,
    ...[...dados.hashesAnexos].sort(),
  ].join("|");

  return createHash("sha256").update(canonico).digest("hex");
}
