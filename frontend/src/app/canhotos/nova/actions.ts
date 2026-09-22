"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { mensagemErroBanco } from "@/lib/db/errors";
import { entregas } from "@/lib/db/schema";
import { obterSetorPadraoId } from "@/lib/data/setores";
import { obterOperadorAutenticado } from "@/lib/operador-auth";
import { checarRateLimit } from "@/lib/rate-limit";
import { geocodificarEntregaGratis } from "@/lib/geocodificacao-gratis";
import type { FormaPagamento } from "@/types/database";

export interface CriarEntregaInput {
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
}

export interface CriarEntregaResult {
  ok: boolean;
  error?: string;
}

export async function criarEntrega(
  input: CriarEntregaInput
): Promise<CriarEntregaResult> {
  const operador = await obterOperadorAutenticado();
  if (!operador) {
    return { ok: false, error: "Sessão inválida ou expirada." };
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

  const coordenadas =
    input.latitude !== null && input.longitude !== null
      ? {
          latitude: input.latitude,
          longitude: input.longitude,
        }
      : await geocodificarEntregaGratis({
          endereco: input.endereco,
          cep,
        });

  // gestor_setor cadastra sempre no próprio setor. Admin não tem setor
  // próprio, então a entrega cai no setor padrão (única forma de continuar
  // visível pros gestores de setor) — ver @/lib/data/setores.
  const setorId =
    operador.tipo === "gestor_setor"
      ? operador.setorId
      : await obterSetorPadraoId();

  try {
    await db.insert(entregas).values({
      data: input.data,
      clienteNome,
      clienteTelefone: input.clienteTelefone.trim() || null,
      endereco: input.endereco.trim() || null,
      cep: cep || null,
      latitude:
        coordenadas === null ? null : coordenadas.latitude.toFixed(6),
      longitude:
        coordenadas === null ? null : coordenadas.longitude.toFixed(6),
      numeroPedido: input.numeroPedido.trim() || null,
      numeroNfe: input.numeroNfe.trim() || null,
      valorPagamento: input.valorPagamento.toFixed(2),
      formaPagamento: input.formaPagamento,
      motoboyId: input.motoboyId || null,
      observacoes: input.observacoes.trim() || null,
      setorId,
      cadastradoPor: operador.colaboradorId,
      cadastradoPorAdmin:
        operador.tipo === "admin" && !operador.colaboradorId
          ? operador.usuarioAdminId
          : null,
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
