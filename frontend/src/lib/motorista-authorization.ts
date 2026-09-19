import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { entregas, motoboys } from "@/lib/db/schema";
import { obterMotoboyIdDaSessao } from "@/lib/motorista-session";

export const ERRO_MOTORISTA_SESSAO =
  "Sessão expirada — faça login novamente.";

export async function obterMotoristaAutorizado(): Promise<string | null> {
  const motoboyId = await obterMotoboyIdDaSessao();
  if (!motoboyId) return null;

  const db = getDb();
  if (!db) return null;

  const [motoboy] = await db
    .select({ id: motoboys.id })
    .from(motoboys)
    .where(and(eq(motoboys.id, motoboyId), eq(motoboys.ativo, true)))
    .limit(1);

  return motoboy?.id ?? null;
}

export async function motoristaPodeAcessarEntrega(
  entregaId: string
): Promise<{ motoboyId: string } | null> {
  const motoboyId = await obterMotoristaAutorizado();
  if (!motoboyId) return null;

  const db = getDb();
  if (!db) return null;

  const [entrega] = await db
    .select({ id: entregas.id })
    .from(entregas)
    .where(
      and(
        eq(entregas.id, entregaId),
        eq(entregas.motoboyId, motoboyId)
      )
    )
    .limit(1);

  if (!entrega) return null;
  return { motoboyId };
}
