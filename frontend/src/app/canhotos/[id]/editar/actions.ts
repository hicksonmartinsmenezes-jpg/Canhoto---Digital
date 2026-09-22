"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { obterOperadorAutenticado } from "@/lib/operador-auth";
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
  cep: string;
  latitude: number | null;
  longitude: number | null;
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
  const operador = await obterOperadorAutenticado();
  if (!operador) {
    return { ok: false, error: "Sessão inválida ou expirada." };
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
  const formaPagamento: FormaPagamento = input.formaPagamento;
  const cep = input.cep.replace(/\D/g, "");
  if (cep && cep.length !== 8) {
    return { ok: false, error: "Informe um CEP válido com 8 dígitos." };
  }

  const temLatitude = input.latitude !== null;
  const temLongitude = input.longitude !== null;

  if (temLatitude !== temLongitude) {
    return {
      ok: false,
      error: "Selecione latitude e longitude juntas para o ponto exato.",
    };
  }

  if (
    input.latitude !== null &&
    input.longitude !== null &&
    (
      !Number.isFinite(input.latitude) ||
      !Number.isFinite(input.longitude) ||
      input.latitude < -90 ||
      input.latitude > 90 ||
      input.longitude < -180 ||
      input.longitude > 180
    )
  ) {
    return { ok: false, error: "Localização exata inválida." };
  }

  if (
    input.endereco.trim() &&
    (input.latitude === null || input.longitude === null)
  ) {
    return {
      ok: false,
      error: "Confirme a localização exata da entrega no mapa.",
    };
  }

  try {
    const resultadoTransacao = await db.transaction(async (tx) => {
      const [atual] = await tx
        .select({ status: entregas.status })
        .from(entregas)
        .where(eq(entregas.id, id))
        .limit(1);

      if (!atual) {
        return { ok: false as const, error: "Entrega não encontrada." };
      }

      if (input.status === "entregue" && atual.status !== "entregue") {
        return {
          ok: false as const,
          error:
            "A entrega só pode ser concluída pelo fluxo do motorista com foto e assinatura.",
        };
      }

      if (atual.status === "entregue" && input.status !== "entregue") {
        return {
          ok: false as const,
          error:
            "Uma entrega concluída com comprovante não pode voltar para outro status.",
        };
      }

      const [resultado] = await tx
        .update(entregas)
        .set({
          data: input.data,
          clienteNome,
          clienteTelefone: input.clienteTelefone.trim() || null,
          endereco: input.endereco.trim() || null,
          cep: cep || null,
          latitude:
            input.latitude === null ? null : input.latitude.toFixed(6),
          longitude:
            input.longitude === null ? null : input.longitude.toFixed(6),
          numeroPedido: input.numeroPedido.trim() || null,
          numeroNfe: input.numeroNfe.trim() || null,
          valorPagamento: input.valorPagamento.toFixed(2),
          formaPagamento,
          motoboyId: input.motoboyId || null,
          observacoes: input.observacoes.trim() || null,
          status: input.status,
        })
        .where(eq(entregas.id, id))
        .returning({ id: entregas.id });

      if (!resultado) {
        return { ok: false as const, error: "Entrega não encontrada." };
      }

      if (atual.status !== input.status) {
        await tx.insert(entregaHistorico).values({
          entregaId: id,
          statusAnterior: atual.status,
          statusNovo: input.status,
          alteradoPor: operador.colaboradorId,
          alteradoPorAdmin:
            operador.tipo === "admin" && !operador.colaboradorId
              ? operador.usuarioAdminId
              : null,
        });
      }

      return { ok: true as const };
    });

    if (!resultadoTransacao.ok) {
      return resultadoTransacao;
    }
  } catch (error) {
    return {
      ok: false,
      error: mensagemErroBanco("atualizarEntrega", error),
    };
  }

  revalidatePath("/canhotos");
  revalidatePath("/motorista");
  revalidatePath("/");
  return { ok: true };
}
