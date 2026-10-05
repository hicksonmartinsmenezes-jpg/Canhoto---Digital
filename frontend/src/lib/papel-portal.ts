import "server-only";
import { obterUsuarioAdminIdDaSessao } from "@/lib/admin-session";
import { obterSessaoColaborador } from "@/lib/colaborador-session";

// Só para MONTAR O MENU (esconder o que o gestor_setor não pode abrir).
// Lê apenas os cookies assinados, sem consultar o banco — a autorização de
// verdade é feita em cada página/Server Action (ver sessao-operador.ts).
export type PapelPortal = "admin" | "gestor_setor" | null;

export async function obterPapelPortal(): Promise<PapelPortal> {
  if (await obterUsuarioAdminIdDaSessao()) return "admin";
  if (await obterSessaoColaborador()) return "gestor_setor";
  return null;
}
