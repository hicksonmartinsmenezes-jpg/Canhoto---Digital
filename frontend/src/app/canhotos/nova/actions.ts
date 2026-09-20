"use server";

import { revalidatePath } from "next/cache";
import { obterAdminAutenticado } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { mensagemErroBanco } from "@/lib/db/errors";
import { entregas } from "@/lib/db/schema";
import { checarRateLimit } from "@/lib/rate-limit";
import type { FormaPagamento } from "@/types/database";

export interface CriarEntregaInput {
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
}

export interface CriarEntregaResult {
  ok: boolean;
  error?: string;
}

export async function criarEntrega(
  input: CriarEntregaInput
): Promise<CriarEntregaResult> {
  const admin = await obterAdminAutenticado();
  if (!admin) {
    return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  }

  const limite = await checarRateLimit("criarEntrega");
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
    await db.insert(entregas).values({
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
      cadastradoPor: admin.colaboradorId,
      cadastradoPorAdmin: admin.colaboradorId
        ? null
        : admin.usuarioAdminId,
    });
  } catch (error) {
    return {
      ok: false,
      error: mensagemErroBanco("criarEntrega", error),
    };
  }

  revalidatePath("/canhotos");
  revalidatePath("/motorista");
  revalidatePath("/");
  return { ok: true };
}
