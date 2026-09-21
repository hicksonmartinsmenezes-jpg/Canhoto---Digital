import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { setores } from "@/lib/db/schema";

// Hoje só existe o setor "Expedição" (semeado na migration 0001). Usado
// como setor padrão ao registrar uma entrega quando quem cadastra é Admin
// (que não tem setor próprio) — assim a entrega continua visível pros
// gestores de setor, em vez de nascer sem setor_id.
//
// Se um segundo setor operacional for criado, esse fallback deixa de fazer
// sentido sozinho e a tela de nova entrega precisa ganhar um seletor de
// setor explícito.
export async function obterSetorPadraoId(): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  const [setor] = await db
    .select({ id: setores.id })
    .from(setores)
    .where(eq(setores.nome, "Expedição"))
    .limit(1);

  return setor?.id ?? null;
}
