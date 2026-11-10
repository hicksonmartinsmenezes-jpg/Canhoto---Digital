"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { mensagemErroBanco } from "@/lib/db/errors";
import { entregas } from "@/lib/db/schema";
import { obterUnidadeValidaId } from "@/lib/data/setores";
import { obterOperadorAutenticado } from "@/lib/operador-auth";
import { checarRateLimit } from "@/lib/rate-limit";
import { avisarEntregaNovaAoMotorista } from "@/lib/push/avisar-motorista";
import { geocodificarEntregaGratis } from "@/lib/geocodificacao-gratis";
import type { FormaPagamento } from "@/types/database";

export interface CriarEntregaInput {
  data: string;
  clienteNome: string;
  clienteTelefone: string;
  endereco: string;
  cep: string;
  numeroPedido: string;
  numeroNfe: string;
  /** Venda a consumidor final: sem NF-e (o número da nota é ignorado). */
  clienteFinal: boolean;
  valorPagamento: number;
  formaPagamento: FormaPagamento | "";
  motoboyId: string;
  observacoes: string;
  /** Matriz ou Distribuidora. Só vale para o Admin; colaborador usa a própria. */
  unidadeId?: string;
}

export interface CriarEntregaResult {
  ok: boolean;
  error?: string;
  /** Número da entrega criada (para o aviso "Entrega #123 cadastrada"). */
  numero?: number;
  /** Id da entrega criada (para anexar documentos em seguida). */
  id?: string;
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

  // Endereço obrigatório: o motorista e o Waze dependem dele.
  if (input.endereco.trim().length < 5) {
    return { ok: false, error: "Informe o endereço de entrega (rua, número e bairro)." };
  }

  const cep = input.cep.replace(/\D/g, "");
  if (cep && cep.length !== 8) {
    return { ok: false, error: "Informe um CEP válido com 8 dígitos." };
  }

  const coordenadas = await geocodificarEntregaGratis({
    endereco: input.endereco,
    cep,
  });

  // Unidade de origem (Matriz ou Distribuidora): o colaborador cadastra
  // sempre na própria; o Admin escolhe no formulário.
  let setorId: string | null;
  if (operador.tipo === "gestor_setor") {
    setorId = operador.setorId;
  } else {
    setorId = await obterUnidadeValidaId(input.unidadeId ?? "");
    if (!setorId) return { ok: false, error: "Escolha a unidade." };
  }

  let numero: number | undefined;
  let entregaId: string | undefined;
  try {
    const [criada] = await db.insert(entregas).values({
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
      numeroNfe: input.clienteFinal ? null : input.numeroNfe.trim() || null,
      clienteFinal: input.clienteFinal,
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
    }).returning({ id: entregas.id, numero: entregas.numero });
    numero = criada?.numero;
    entregaId = criada?.id;
  } catch (error) {
    return {
      ok: false,
      error: mensagemErroBanco("criarEntrega", error),
    };
  }

  // Notificação ao motorista (push): em segundo plano, nunca atrasa nem derruba o cadastro.
  if (entregaId && input.motoboyId) {
    void avisarEntregaNovaAoMotorista(entregaId);
  }

  revalidatePath("/canhotos");
  revalidatePath("/motorista");
  revalidatePath("/");
  return { ok: true, numero, id: entregaId };
}
