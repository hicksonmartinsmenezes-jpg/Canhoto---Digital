import "server-only";

// Versão de obterAdminAutenticado() (@/lib/admin-auth) que também aceita
// colaborador com papel "gestor_setor" — usado nas Server Actions de
// escrita que um gestor_setor também deve poder executar (por enquanto:
// criar/editar/atualizar status de entregas). Ações mais sensíveis
// (Colaboradores, Motoboys, Veículos, Configurações) continuam exigindo
// obterAdminAutenticado() puro, sem passar por aqui.

import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { colaboradores } from "@/lib/db/schema";
import { obterAdminAutenticado } from "@/lib/admin-auth";
import { obterSessaoColaborador } from "@/lib/colaborador-session";

export type OperadorAutenticado =
  | {
      tipo: "admin";
      usuarioAdminId: string;
      colaboradorId: string | null;
      setorId: string | null;
    }
  | {
      tipo: "gestor_setor";
      colaboradorId: string;
      setorId: string | null;
    };

export async function obterOperadorAutenticado(): Promise<OperadorAutenticado | null> {
  const admin = await obterAdminAutenticado();
  if (admin) {
    return {
      tipo: "admin",
      usuarioAdminId: admin.usuarioAdminId,
      colaboradorId: admin.colaboradorId,
      // Setor do próprio Admin (se o colaborador vinculado tiver um) —
      // usado só como default ao criar uma entrega, não pra filtrar o que
      // ele vê (Admin sempre vê tudo).
      setorId: null,
    };
  }

  const sessaoColaborador = await obterSessaoColaborador();
  if (!sessaoColaborador) return null;

  const db = getDb();
  if (!db) return null;

  const [colaborador] = await db
    .select({ id: colaboradores.id, setorId: colaboradores.setorId })
    .from(colaboradores)
    .where(
      and(
        eq(colaboradores.id, sessaoColaborador.colaboradorId),
        eq(colaboradores.ativo, true),
        eq(colaboradores.papel, "gestor_setor")
      )
    )
    .limit(1);

  if (!colaborador) return null;

  return {
    tipo: "gestor_setor",
    colaboradorId: colaborador.id,
    setorId: colaborador.setorId,
  };
}
