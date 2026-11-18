// Parte pura (sem "server-only") do escopo de dados — testável com Vitest.

export type SessaoOperador =
  | { tipo: "admin"; usuarioAdminId: string }
  | { tipo: "gestor_setor"; colaboradorId: string; setorId: string | null };

// Conveniência pras consultas em lib/data/entregas.ts. Administrador e
// colaborador enxergam exatamente os mesmos dados:
// - undefined => sessão válida (admin ou colaborador), não filtra.
// - null => sem sessão válida; as funções de lib/data/entregas.ts tratam
//   null como "não mostra nada", nunca como "não filtra" — falha fechada.
export function setorIdParaFiltro(
  sessao: SessaoOperador | null
): string | null | undefined {
  if (!sessao) return null;
  return undefined;
}

// Qualquer sessão válida (admin ou colaborador) pode ver/alterar a entrega,
// de qualquer setor. Sem sessão nega.
export function sessaoPodeAcessarSetor(
  sessao: SessaoOperador | null,
  // Mantido na assinatura para não mexer em todos os chamadores.
  _setorDaEntrega: string | null
): boolean {
  return sessao !== null;
}
