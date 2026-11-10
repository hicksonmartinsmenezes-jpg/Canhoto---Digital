import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { setores } from "@/lib/db/schema";

// Unidades de onde as entregas são cadastradas. Usam a tabela setores
// (semeadas na migration 0022).
const NOMES_UNIDADES = ["Matriz", "Distribuidora"] as const;

export interface UnidadeOption {
  id: string;
  nome: string;
}

export async function getUnidades(): Promise<UnidadeOption[]> {
  const db = getDb();
  if (!db) return [];

  return db
    .select({ id: setores.id, nome: setores.nome })
    .from(setores)
    .where(inArray(setores.nome, [...NOMES_UNIDADES]))
    .orderBy(asc(setores.nome));
}

/** O id vem do cliente: só vale se for mesmo Matriz ou Distribuidora. */
export async function obterUnidadeValidaId(
  unidadeId: string
): Promise<string | null> {
  if (!unidadeId) return null;

  const db = getDb();
  if (!db) return null;

  const [unidade] = await db
    .select({ id: setores.id })
    .from(setores)
    .where(
      and(eq(setores.id, unidadeId), inArray(setores.nome, [...NOMES_UNIDADES]))
    )
    .limit(1);

  return unidade?.id ?? null;
}
