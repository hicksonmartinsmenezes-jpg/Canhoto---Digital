import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { treinamentoProgresso } from "@/lib/db/schema";
import type { StatusTreinamento } from "@/lib/treinamentos";

export type DonoTreinamento =
  | { usuarioAdminId: string; colaboradorId?: undefined }
  | { colaboradorId: string; usuarioAdminId?: undefined };

export function condicaoDono(dono: DonoTreinamento) {
  return dono.colaboradorId
    ? eq(treinamentoProgresso.colaboradorId, dono.colaboradorId)
    : eq(treinamentoProgresso.usuarioAdminId, dono.usuarioAdminId as string);
}

export interface TreinamentoProgressoItem {
  slug: string;
  status: Exclude<StatusTreinamento, "nao_iniciado">;
  iniciadoEm: string;
  concluidoEm: string | null;
}

export async function getTreinamentosProgresso(
  dono: DonoTreinamento
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
    .where(condicaoDono(dono));
}

export async function getTreinamentoProgresso(
  dono: DonoTreinamento,
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
        condicaoDono(dono),
        eq(treinamentoProgresso.treinamentoSlug, slug)
      )
    )
    .limit(1);

  return progresso ?? null;
}
