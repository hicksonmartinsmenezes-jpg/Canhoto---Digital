// Parte pura (sem "server-only") do escopo por setor — testável com Vitest.

export type SessaoOperador =
  | { tipo: "admin"; usuarioAdminId: string }
  | { tipo: "gestor_setor"; colaboradorId: string; setorId: string | null };

// Conveniência pras consultas em lib/data/entregas.ts:
// - undefined => Admin, não filtra, vê tudo.
// - uuid do setor => gestor_setor normal, filtra por esse setor.
// - null => sem sessão válida OU gestor_setor SEM setor cadastrado; as
//   funções de lib/data/entregas.ts tratam null como "não mostra nada",
//   nunca como "não filtra" — falha fechada.
export function setorIdParaFiltro(
  sessao: SessaoOperador | null
): string | null | undefined {
  if (!sessao) return null;
  if (sessao.tipo === "admin") return undefined;
  return sessao.setorId;
}

// A entrega (identificada pelo setor dela) pode ser vista/alterada por
// esta sessão? Admin sempre; gestor_setor só no próprio setor.
export function sessaoPodeAcessarSetor(
  sessao: SessaoOperador | null,
  setorDaEntrega: string | null
): boolean {
  if (!sessao) return false;
  if (sessao.tipo === "admin") return true;
  return Boolean(sessao.setorId) && sessao.setorId === setorDaEntrega;
}
