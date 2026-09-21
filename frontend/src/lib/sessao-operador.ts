import "server-only";

// Helper único pras páginas do Portal descobrirem quem está logado sem se
// importar se é Admin (vê tudo) ou colaborador com papel "gestor_setor"
// (vê só o setor dele). proxy.ts já garante que só um desses dois chega
// até a página — esse helper só identifica QUAL dos dois, pra decidir se
// aplica filtro de setor nas consultas.

import { obterUsuarioAdminIdDaSessao } from "@/lib/admin-session";
import { obterSessaoColaborador } from "@/lib/colaborador-session";

export type SessaoOperador =
  | { tipo: "admin"; usuarioAdminId: string }
  | { tipo: "gestor_setor"; colaboradorId: string; setorId: string | null };

export async function obterSessaoOperador(): Promise<SessaoOperador | null> {
  const usuarioAdminId = await obterUsuarioAdminIdDaSessao();
  if (usuarioAdminId) {
    return { tipo: "admin", usuarioAdminId };
  }

  const sessaoColaborador = await obterSessaoColaborador();
  if (sessaoColaborador) {
    return {
      tipo: "gestor_setor",
      colaboradorId: sessaoColaborador.colaboradorId,
      setorId: sessaoColaborador.setorId,
    };
  }

  return null;
}

// Conveniência pras consultas em lib/data/entregas.ts:
// - undefined => Admin, não filtra, vê tudo.
// - uuid do setor => gestor_setor normal, filtra por esse setor.
// - null => gestor_setor SEM setor cadastrado (caso raro/mal configurado);
//   as funções de lib/data/entregas.ts tratam null como "não mostra nada",
//   nunca como "não filtra" — importante não confundir os dois.
export function setorIdParaFiltro(
  sessao: SessaoOperador | null
): string | null | undefined {
  if (!sessao || sessao.tipo === "admin") return undefined;
  return sessao.setorId;
}
