// Monta o texto do histórico quando alguém edita dados sensíveis de uma
// entrega (valor, forma de pagamento, cliente, motorista, data). Fica num
// arquivo puro — sem banco nem "server-only" — para ser testado com Vitest.

import { formatBRL, formatDateBR } from "@/lib/format";
import { FORMA_PAGAMENTO_LABEL } from "@/lib/status";
import type { FormaPagamento } from "@/types/database";

export interface DadosAuditados {
  data: string;
  clienteNome: string;
  valorPagamento: number;
  formaPagamento: FormaPagamento;
  motoboyId: string | null;
}

/** Nome do motorista por id; ausente ou null vira "sem motorista". */
export type NomesMotoboy = Record<string, string>;

function nomeMotoboy(id: string | null, nomes: NomesMotoboy): string {
  if (!id) return "sem motorista";
  return nomes[id] ?? "motorista removido";
}

/**
 * Lista cada campo que mudou, no formato "Campo: antes → depois".
 * Lista vazia = nada auditável mudou (não grava histórico).
 */
export function descreverAlteracoes(
  antes: DadosAuditados,
  depois: DadosAuditados,
  nomes: NomesMotoboy = {}
): string[] {
  const mudancas: string[] = [];

  if (antes.data.slice(0, 10) !== depois.data.slice(0, 10)) {
    mudancas.push(
      `Data: ${formatDateBR(antes.data)} → ${formatDateBR(depois.data)}`
    );
  }

  if (antes.clienteNome.trim() !== depois.clienteNome.trim()) {
    mudancas.push(
      `Cliente: ${antes.clienteNome.trim()} → ${depois.clienteNome.trim()}`
    );
  }

  // Compara em centavos para não acusar mudança por arredondamento.
  if (
    Math.round(antes.valorPagamento * 100) !==
    Math.round(depois.valorPagamento * 100)
  ) {
    mudancas.push(
      `Valor: ${formatBRL(antes.valorPagamento)} → ${formatBRL(depois.valorPagamento)}`
    );
  }

  if (antes.formaPagamento !== depois.formaPagamento) {
    mudancas.push(
      `Pagamento: ${FORMA_PAGAMENTO_LABEL[antes.formaPagamento]} → ${FORMA_PAGAMENTO_LABEL[depois.formaPagamento]}`
    );
  }

  if ((antes.motoboyId ?? null) !== (depois.motoboyId ?? null)) {
    mudancas.push(
      `Motorista: ${nomeMotoboy(antes.motoboyId, nomes)} → ${nomeMotoboy(depois.motoboyId, nomes)}`
    );
  }

  return mudancas;
}

/** Texto gravado em entrega_historico.observacao. */
export function observacaoDeAlteracoes(mudancas: string[]): string {
  return `Dados alterados — ${mudancas.join("; ")}.`;
}
