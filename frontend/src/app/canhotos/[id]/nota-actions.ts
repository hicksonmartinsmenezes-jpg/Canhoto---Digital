"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { mensagemErroBanco } from "@/lib/db/errors";
import { entregaHistorico, entregas } from "@/lib/db/schema";
import { obterOperadorAutenticado } from "@/lib/operador-auth";
import { MAX_NUMERO_NFE } from "@/lib/nota-fiscal";
import { checarRateLimit } from "@/lib/rate-limit";

export interface LancarNotaResult {
  ok: boolean;
  error?: string;
}

/**
 * Lança a NF-e de uma entrega que ficou sem ela. A nota costuma ser emitida
 * depois do pagamento, e muitas vezes o pagamento acontece na própria
 * entrega: por isso o número chega depois, às vezes com a entrega já
 * concluída.
 *
 * Ação própria, e não a edição completa: só preenche o número quando está
 * vazio, nunca troca um número já gravado, e a colaboradora da unidade pode
 * fazer isso sem poder mexer no resto de uma entrega concluída.
 */
export async function lancarNotaFiscal(
  entregaId: string,
  numeroNfe: string
): Promise<LancarNotaResult> {
  const operador = await obterOperadorAutenticado();
  if (!operador) {
    return { ok: false, error: "Sessão inválida ou expirada." };
  }

  const limite = await checarRateLimit("lancarNotaFiscal");
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const numero = numeroNfe.trim();
  if (!numero) {
    return { ok: false, error: "Informe o número da NF-e." };
  }
  if (numero.length > MAX_NUMERO_NFE) {
    return { ok: false, error: "O número da NF-e está muito longo." };
  }

  const db = getDb();
  if (!db) {
    return {
      ok: false,
      error:
        "Banco de dados indisponível neste ambiente — confirme a DATABASE_URL.",
    };
  }

  try {
    const gravou = await db.transaction(async (tx) => {
      const [atual] = await tx
        .select({
          status: entregas.status,
          setorId: entregas.setorId,
          clienteFinal: entregas.clienteFinal,
          numeroNfe: entregas.numeroNfe,
        })
        .from(entregas)
        .where(eq(entregas.id, entregaId))
        .limit(1);

      if (!atual) {
        return { ok: false as const, error: "Entrega não encontrada." };
      }

      // Colaboradora só mexe na própria unidade; o Admin vê todas.
      if (
        operador.tipo === "gestor_setor" &&
        (!operador.setorId || operador.setorId !== atual.setorId)
      ) {
        return { ok: false as const, error: "Entrega de outra unidade." };
      }

      if (atual.status === "cancelado") {
        return {
          ok: false as const,
          error: "Entrega cancelada não recebe número de NF-e.",
        };
      }
      if (atual.clienteFinal) {
        return {
          ok: false as const,
          error:
            "A venda está marcada como consumidor final, sem NF-e. Para lançar a nota, desmarque na edição.",
        };
      }
      if (atual.numeroNfe?.trim()) {
        return {
          ok: false as const,
          error:
            "Esta entrega já tem número de NF-e. Para trocá-lo, use a edição.",
        };
      }

      // isNull de novo na condição: se outra pessoa lançou enquanto esta
      // página estava aberta, nada é sobrescrito.
      const [atualizada] = await tx
        .update(entregas)
        .set({ numeroNfe: numero })
        .where(and(eq(entregas.id, entregaId), isNull(entregas.numeroNfe)))
        .returning({ id: entregas.id });

      if (!atualizada) {
        return {
          ok: false as const,
          error: "O número da NF-e acabou de ser lançado por outra pessoa.",
        };
      }

      await tx.insert(entregaHistorico).values({
        entregaId,
        statusAnterior: atual.status,
        statusNovo: atual.status,
        alteradoPor: operador.colaboradorId,
        alteradoPorAdmin:
          operador.tipo === "admin" && !operador.colaboradorId
            ? operador.usuarioAdminId
            : null,
        observacao: `NF-e: sem número → ${numero}`,
      });

      return { ok: true as const };
    });

    if (!gravou.ok) return gravou;
  } catch (error) {
    return { ok: false, error: mensagemErroBanco("lancarNotaFiscal", error) };
  }

  revalidatePath(`/canhotos/${entregaId}`);
  revalidatePath("/canhotos");
  revalidatePath("/");
  return { ok: true };
}
