// Regras de quem recebeu a mercadoria. Usadas no app do motorista (para avisar
// na hora) e no servidor (que é quem decide).

const RECEBEDOR_NOME_MAX = 120;
const RECEBEDOR_VINCULO_MAX = 120;

function limparEspacos(valor: string): string {
  return valor.replace(/\s+/g, " ").trim();
}

/** Nome com espaços normalizados. */
export function normalizarNomeRecebedor(valor: string): string {
  return limparEspacos(valor);
}

/**
 * Nome completo: ao menos nome e sobrenome, cada um com 2 letras ou mais.
 * "Maria da Silva" e "Ana Lu" passam; "Alexandre" e "A B" não.
 */
export function nomeRecebedorValido(nome: string): boolean {
  const limpo = limparEspacos(nome);
  if (limpo.length > RECEBEDOR_NOME_MAX) return false;
  const palavras = limpo.split(" ");
  if (palavras.length < 2) return false;
  return palavras[0].length >= 2 && palavras[palavras.length - 1].length >= 2;
}

/** Empresa ou vínculo (opcional). Vazio vira null; acima do limite, inválido. */
export function normalizarVinculoRecebedor(
  valor: string | null | undefined,
): { ok: true; valor: string | null } | { ok: false } {
  const limpo = limparEspacos(valor ?? "");
  if (!limpo) return { ok: true, valor: null };
  if (limpo.length > RECEBEDOR_VINCULO_MAX) return { ok: false };
  return { ok: true, valor: limpo };
}

export const MENSAGEM_NOME_COMPLETO =
  "Informe o nome completo de quem recebeu a mercadoria (nome e sobrenome).";
