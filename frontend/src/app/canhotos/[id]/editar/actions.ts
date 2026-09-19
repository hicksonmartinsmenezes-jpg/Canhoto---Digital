"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { obterAdminAutenticado } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { mensagemErroBanco } from "@/lib/db/errors";
import { entregaHistorico, entregas } from "@/lib/db/schema";
import { checarRateLimit } from "@/lib/rate-limit";
import type { FormaPagamento, StatusEntrega } from "@/types/database";

export interface AtualizarEntregaInput {
  data: string;
  clienteNome: string;
  clienteTelefone: string;
  endereco: string;
  numeroPedido: string;
  numeroNfe: string;
  valorPagamento: number;
  formaPagamento: FormaPagamento | "";
  motoboyId: string;
  observacoes: string;
  status: StatusEntrega;
}

export interface AtualizarEntregaResult {
  ok: boolean;
  error?: string;
}

export async function atualizarEntrega(
  id: string,
  input: AtualizarEntregaInput
): Promise<AtualizarEntregaResult> {
  const admin = await obterAdminAutenticado();
  if (!admin) {
    return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  }

  const limite = await checarRateLimit("atualizarEntrega");
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const db = getDb();
  if (!db) {
    return {
      ok: false,
      error:
        "Banco de dados indisponível neste ambiente — confirme a DATABASE_URL.",
    };
  }

  const clienteNome = input.clienteNome.trim();
  if (!clienteNome) {
    return { ok: false, error: "Informe o nome do cliente." };
  }
  if (!input.valorPagamento || input.valorPagamento <= 0) {
    return { ok: false, error: "Informe um valor de pagamento válido." };
  }
  if (!input.formaPagamento) {
    return { ok: false, error: "Selecione a forma de pagamento." };
  }

  try {
    const atualizada = await db.transaction(async (tx) => {
      const [atual] = await tx
        .select({ status: entregas.status })
        .from(entregas)
        .where(eq(entregas.id, id))
        .limit(1);

      if (!atual) return false;

      const [resultado] = await tx
        .update(entregas)
        .set({
          data: input.data,
          clienteNome,
          clienteTelefone: input.clienteTelefone.trim() || null,
          endereco: input.endereco.trim() || null,
          numeroPedido: input.numeroPedido.trim() || null,
          numeroNfe: input.numeroNfe.trim() || null,
          valorPagamento: input.valorPagamento.toFixed(2),
          formaPagamento: input.formaPagamento,
          motoboyId: input.motoboyId || null,
          observacoes: input.observacoes.trim() || null,
          status: input.status,
        })
        .where(eq(entregas.id, id))
        .returning({ id: entregas.id });

      if (!resultado) return false;

      if (atual.status !== input.status) {
        await tx.insert(entregaHistorico).values({
          entregaId: id,
          statusAnterior: atual.status,
          statusNovo: input.status,
          alteradoPor: admin.colaboradorId,
          alteradoPorAdmin: admin.colaboradorId
            ? null
            : admin.usuarioAdminId,
        });
      }

      return true;
    });

    if (!atualizada) {
      return { ok: false, error: "Entrega não encontrada." };
    }
  } catch (error) {
    return {
      ok: false,
      error: mensagemErroBanco("atualizarEntrega", error),
    };
  }

  revalidatePath("/canhotos");
  revalidatePath("/");
  return { ok: true };
}
