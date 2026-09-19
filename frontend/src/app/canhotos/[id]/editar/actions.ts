"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { obterAdminAutenticado } from "@/lib/admin-auth";
import { checarRateLimit } from "@/lib/rate-limit";
import { descreverErroSupabase } from "@/lib/erros-supabase";
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
      error: "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return {
      ok: false,
      error:
        "O Supabase ainda não está configurado neste ambiente — confirme o .env.local.",
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

  const { data, error } = await supabase.rpc("atualizar_entrega_admin", {
    p_entrega_id: id,
    p_data: input.data,
    p_cliente_nome: clienteNome,
    p_cliente_telefone: input.clienteTelefone.trim() || null,
    p_endereco: input.endereco.trim() || null,
    p_numero_pedido: input.numeroPedido.trim() || null,
    p_numero_nfe: input.numeroNfe.trim() || null,
    p_valor_pagamento: input.valorPagamento,
    p_forma_pagamento: input.formaPagamento,
    p_motoboy_id: input.motoboyId || null,
    p_observacoes: input.observacoes.trim() || null,
    p_status: input.status,
    p_auth_user_id: admin.authUserId,
    p_colaborador_id: admin.colaboradorId,
  });

  if (error) {
    return { ok: false, error: `Erro ao salvar as alterações: ${descreverErroSupabase(error.message)}.` };
  }
  if (!data) {
    return { ok: false, error: "Entrega não encontrada." };
  }

  revalidatePath("/canhotos");
  revalidatePath("/");
  return { ok: true };
}
