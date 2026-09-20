import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { treinamentoProgresso } from "@/lib/db/schema";
import type { StatusTreinamento } from "@/lib/treinamentos";

export interface TreinamentoProgressoItem {
  slug: string;
  status: Exclude<StatusTreinamento, "nao_iniciado">;
  iniciadoEm: string;
  concluidoEm: string | null;
}

export async function getTreinamentosProgresso(
  usuarioAdminId: string
): Promise<TreinamentoProgressoItem[]> {
  const db = getDb();
  if (!db) return [];

  return db
    .select({
      slug: treinamentoProgresso.treinamentoSlug,
      status: treinamentoProgresso.status,
      iniciadoEm: treinamentoProgresso.iniciadoEm,
      concluidoEm: treinamentoProgresso.concluidoEm,
    })
    .from(treinamentoProgresso)
    .where(eq(treinamentoProgresso.usuarioAdminId, usuarioAdminId));
}

export async function getTreinamentoProgresso(
  usuarioAdminId: string,
  slug: string
): Promise<TreinamentoProgressoItem | null> {
  const db = getDb();
  if (!db) return null;

  const [progresso] = await db
    .select({
      slug: treinamentoProgresso.treinamentoSlug,
      status: treinamentoProgresso.status,
      iniciadoEm: treinamentoProgresso.iniciadoEm,
      concluidoEm: treinamentoProgresso.concluidoEm,
    })
    .from(treinamentoProgresso)
    .where(
      and(
        eq(treinamentoProgresso.usuarioAdminId, usuarioAdminId),
        eq(treinamentoProgresso.treinamentoSlug, slug)
      )
    )
    .limit(1);

  return progresso ?? null;
}
