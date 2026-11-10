"use server";

import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { exigirAdminAutenticado } from "@/lib/admin-auth";
import { obterOperadorAutenticado } from "@/lib/operador-auth";
import { getDb } from "@/lib/db";
import { mensagemErroBanco } from "@/lib/db/errors";
import {
  entregaAnexos,
  entregaHistorico,
  entregas,
  motoboyLocalizacoes,
} from "@/lib/db/schema";
import { checarRateLimit, RATE_LIMIT_ESTRITO } from "@/lib/rate-limit";
import { avisarEntregaRetiradaDoMotorista } from "@/lib/push/avisar-motorista";

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

export interface CancelarEntregaResult {
  ok: boolean;
  error?: string;
}

const MOTIVO_MINIMO = 3;
const MOTIVO_MAXIMO = 300;

/**
 * Cancela uma entrega que ainda não foi concluída, com motivo obrigatório
 * registrado no histórico (quem, quando e por quê). Admin cancela qualquer
 * uma; gestor de setor só as do próprio setor.
 */
export async function cancelarEntrega(
  id: string,
  motivoBruto: string
): Promise<CancelarEntregaResult> {
  const operador = await obterOperadorAutenticado();
  if (!operador) {
    return { ok: false, error: "Sessão inválida ou expirada." };
  }

  const motivo = (motivoBruto ?? "").trim().replace(/\s+/g, " ");
  if (motivo.length < MOTIVO_MINIMO) {
    return { ok: false, error: "Informe o motivo do cancelamento." };
  }
  if (motivo.length > MOTIVO_MAXIMO) {
    return {
      ok: false,
      error: `O motivo pode ter no máximo ${MOTIVO_MAXIMO} caracteres.`,
    };
  }

  const limite = await checarRateLimit("cancelarEntrega");
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
          status: entregas.status,
          setorId: entregas.setorId,
          motoboyId: entregas.motoboyId,
        })
        .from(entregas)
        .where(eq(entregas.id, id))
        .for("update")
        .limit(1);

      if (!atual) {
        return { ok: false as const, error: "Entrega não encontrada." };
      }
      if (atual.status === "cancelado") {
        return { ok: false as const, error: "Esta entrega já está cancelada." };
      }
      if (atual.status === "entregue") {
        return {
          ok: false as const,
          error:
            "Entrega já concluída com comprovante não pode ser cancelada.",
        };
      }

      await tx
        .update(entregas)
        .set({ status: "cancelado" })
        .where(and(eq(entregas.id, id), eq(entregas.status, "pendente")));

      await tx.insert(entregaHistorico).values({
        entregaId: id,
        statusAnterior: atual.status,
        statusNovo: "cancelado",
        alteradoPor: operador.colaboradorId,
        alteradoPorAdmin:
          operador.tipo === "admin" && !operador.colaboradorId
            ? operador.usuarioAdminId
            : null,
        observacao: `Motivo do cancelamento: ${motivo}`,
      });

      return { ok: true as const, motoboyId: atual.motoboyId };
    });

    if (!resultado.ok) return resultado;

    // Avisa o motorista (push) de que a entrega saiu da lista dele.
    if (resultado.motoboyId) {
      void avisarEntregaRetiradaDoMotorista(id, resultado.motoboyId, "cancelada");
    }

    // Motorista sem mais nenhuma entrega na rua: a última posição deixa de
    // aparecer para a loja (mesma regra de quando ele conclui a última).
    if (resultado.motoboyId) {
      try {
        const [outraEmRota] = await db
          .select({ id: entregas.id })
          .from(entregas)
          .where(
            and(
              eq(entregas.motoboyId, resultado.motoboyId),
              eq(entregas.status, "pendente"),
              isNotNull(entregas.horaSaida)
            )
          )
          .limit(1);
        if (!outraEmRota) {
          await db
            .delete(motoboyLocalizacoes)
            .where(eq(motoboyLocalizacoes.motoboyId, resultado.motoboyId));
        }
      } catch {
        // Limpeza da localização é melhor-esforço.
      }
    }
  } catch (error) {
    return { ok: false, error: mensagemErroBanco("cancelarEntrega", error) };
  }

  revalidatePath("/canhotos");
  revalidatePath(`/canhotos/${id}`);
  revalidatePath("/motorista");
  revalidatePath("/");
  return { ok: true };
}
