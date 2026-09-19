"use server";

import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { entregaHistorico, entregas } from "@/lib/db/schema";
import { checarRateLimit } from "@/lib/rate-limit";
import {
  ERRO_MOTORISTA_SESSAO,
  motoristaPodeAcessarEntrega,
} from "@/lib/motorista-authorization";
import { encerrarSessaoMotorista } from "@/lib/motorista-session";

export async function sairMotorista(): Promise<void> {
  await encerrarSessaoMotorista();
  redirect("/motorista/login");
}

export interface AcaoEntregaResult {
  ok: boolean;
  error?: string;
}

const ERRO_BANCO =
  "Banco de dados indisponível neste ambiente — confirme a DATABASE_URL.";

function horaLocalAtual(): string {
  return new Date().toTimeString().slice(0, 8);
}

export async function iniciarEntrega(
  entregaId: string
): Promise<AcaoEntregaResult> {
  const limite = await checarRateLimit("iniciarEntrega");
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const acesso = await motoristaPodeAcessarEntrega(entregaId);
  if (!acesso) return { ok: false, error: ERRO_MOTORISTA_SESSAO };

  const db = getDb();
  if (!db) return { ok: false, error: ERRO_BANCO };

  try {
    const [atualizada] = await db
      .update(entregas)
      .set({ horaSaida: horaLocalAtual() })
      .where(
        and(
          eq(entregas.id, entregaId),
          eq(entregas.motoboyId, acesso.motoboyId),
          eq(entregas.status, "pendente"),
          isNull(entregas.horaSaida)
        )
      )
      .returning({ id: entregas.id });

    if (!atualizada) {
      return {
        ok: false,
        error: "Entrega não encontrada ou já iniciada.",
      };
    }
  } catch {
    return {
      ok: false,
      error: "Erro ao iniciar a entrega. Tente novamente.",
    };
  }

  revalidatePath("/motorista");
  return { ok: true };
}

export async function confirmarEntrega(
  entregaId: string
): Promise<AcaoEntregaResult> {
  const limite = await checarRateLimit("confirmarEntrega");
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const acesso = await motoristaPodeAcessarEntrega(entregaId);
  if (!acesso) return { ok: false, error: ERRO_MOTORISTA_SESSAO };

  const db = getDb();
  if (!db) return { ok: false, error: ERRO_BANCO };

  try {
    const confirmado = await db.transaction(async (tx) => {
      const [atualizada] = await tx
        .update(entregas)
        .set({
          clienteAssinouEm: new Date().toISOString(),
          status: "entregue",
        })
        .where(
          and(
            eq(entregas.id, entregaId),
            eq(entregas.motoboyId, acesso.motoboyId),
            eq(entregas.status, "pendente"),
            isNotNull(entregas.horaSaida)
          )
        )
        .returning({ id: entregas.id });

      if (!atualizada) return false;

      await tx.insert(entregaHistorico).values({
        entregaId,
        statusAnterior: "pendente",
        statusNovo: "entregue",
        alteradoPorMotoboy: acesso.motoboyId,
      });

      return true;
    });

    if (!confirmado) {
      return {
        ok: false,
        error: "Entrega não encontrada ou ainda não iniciada.",
      };
    }
  } catch {
    return {
      ok: false,
      error: "Erro ao confirmar a entrega. Tente novamente.",
    };
  }

  revalidatePath("/motorista");
  return { ok: true };
}
