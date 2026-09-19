"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { exigirAdminAutenticado } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { mensagemErroBanco } from "@/lib/db/errors";
import { colaboradores, entregas } from "@/lib/db/schema";
import { checarRateLimit, RATE_LIMIT_ESTRITO } from "@/lib/rate-limit";

export interface ExcluirEntregaResult {
  ok: boolean;
  error?: string;
}

const ERRO_BANCO =
  "Banco de dados indisponível neste ambiente — confirme a DATABASE_URL.";

export async function excluirEntrega(
  id: string
): Promise<ExcluirEntregaResult> {
  if (!(await exigirAdminAutenticado())) {
    return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  }

  const limite = await checarRateLimit("excluirEntrega", RATE_LIMIT_ESTRITO);
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const db = getDb();
  if (!db) return { ok: false, error: ERRO_BANCO };

  try {
    const [excluida] = await db
      .delete(entregas)
      .where(eq(entregas.id, id))
      .returning({ id: entregas.id });

    if (!excluida) {
      return { ok: false, error: "Entrega não encontrada." };
    }
  } catch (error) {
    return {
      ok: false,
      error: mensagemErroBanco("excluirEntrega", error),
    };
  }

  revalidatePath("/canhotos");
  revalidatePath("/");
  return { ok: true };
}

export interface ConferirCaixaResult {
  ok: boolean;
  error?: string;
}

export async function conferirCaixa(
  entregaId: string,
  colaboradorId: string
): Promise<ConferirCaixaResult> {
  if (!(await exigirAdminAutenticado())) {
    return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  }

  const limite = await checarRateLimit("conferirCaixa");
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const db = getDb();
  if (!db) return { ok: false, error: ERRO_BANCO };

  if (!colaboradorId) {
    return { ok: false, error: "Selecione quem conferiu o caixa." };
  }

  const [colaborador] = await db
    .select({ id: colaboradores.id })
    .from(colaboradores)
    .where(
      and(
        eq(colaboradores.id, colaboradorId),
        eq(colaboradores.ativo, true)
      )
    )
    .limit(1);

  if (!colaborador) {
    return { ok: false, error: "Colaborador inválido ou inativo." };
  }

  try {
    const [atualizada] = await db
      .update(entregas)
      .set({
        caixaId: colaboradorId,
        caixaConfirmouEm: new Date().toISOString(),
      })
      .where(
        and(
          eq(entregas.id, entregaId),
          isNull(entregas.caixaConfirmouEm)
        )
      )
      .returning({ id: entregas.id });

    if (!atualizada) {
      return {
        ok: false,
        error: "Essa entrega já foi conferida por outra pessoa.",
      };
    }
  } catch (error) {
    return {
      ok: false,
      error: mensagemErroBanco("conferirCaixa", error),
    };
  }

  revalidatePath("/canhotos");
  revalidatePath("/");
  return { ok: true };
}
