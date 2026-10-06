"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { exigirAdminAutenticado } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { mensagemErroBanco } from "@/lib/db/errors";
import { entregaAnexos, entregaHistorico, entregas } from "@/lib/db/schema";
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
    const resultado = await db.transaction(async (tx) => {
      const [atual] = await tx
        .select({
          id: entregas.id,
          status: entregas.status,
          horaSaida: entregas.horaSaida,
          clienteAssinouEm: entregas.clienteAssinouEm,
          caixaConfirmouEm: entregas.caixaConfirmouEm,
        })
        .from(entregas)
        .where(eq(entregas.id, id))
        .for("update")
        .limit(1);

      if (!atual) {
        return { ok: false as const, error: "Entrega não encontrada." };
      }

      if (
        atual.status !== "pendente" ||
        atual.horaSaida !== null ||
        atual.clienteAssinouEm !== null ||
        atual.caixaConfirmouEm !== null
      ) {
        return {
          ok: false as const,
          error:
            "Esta entrega já entrou no fluxo operacional e deve ser preservada. Use cancelamento quando aplicável.",
        };
      }

      const [[anexo], [historico]] = await Promise.all([
        tx
          .select({ id: entregaAnexos.id })
          .from(entregaAnexos)
          .where(eq(entregaAnexos.entregaId, id))
          .limit(1),
        tx
          .select({ id: entregaHistorico.id })
          .from(entregaHistorico)
          .where(eq(entregaHistorico.entregaId, id))
          .limit(1),
      ]);

      if (anexo || historico) {
        return {
          ok: false as const,
          error:
            "Esta entrega possui comprovantes ou histórico e não pode ser excluída.",
        };
      }

      const [excluida] = await tx
        .delete(entregas)
        .where(
          and(
            eq(entregas.id, id),
            eq(entregas.status, "pendente"),
            isNull(entregas.horaSaida),
            isNull(entregas.clienteAssinouEm),
            isNull(entregas.caixaConfirmouEm)
          )
        )
        .returning({ id: entregas.id });

      if (!excluida) {
        return {
          ok: false as const,
          error:
            "A entrega mudou enquanto era validada e não pode mais ser excluída.",
        };
      }

      return { ok: true as const };
    });

    if (!resultado.ok) {
      return resultado;
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
