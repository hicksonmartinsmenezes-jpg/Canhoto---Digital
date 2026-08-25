"use server";

// Server Action: edição de uma Entrega já cadastrada (inclui mudar a
// situação — pendente/entregue/cancelado — já que ainda não existem telas
// dedicadas para "saída"/"confirmação do cliente"). Mesma justificativa do
// cliente service-role das outras actions do módulo — ver comentário em
// @/lib/supabase/admin.

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const { error } = await supabase
    .from("entregas")
    .update({
      data: input.data,
      cliente_nome: clienteNome,
      cliente_telefone: input.clienteTelefone.trim() || null,
      endereco: input.endereco.trim() || null,
      numero_pedido: input.numeroPedido.trim() || null,
      numero_nfe: input.numeroNfe.trim() || null,
      valor_pagamento: input.valorPagamento,
      forma_pagamento: input.formaPagamento,
      motoboy_id: input.motoboyId || null,
      observacoes: input.observacoes.trim() || null,
      status: input.status,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: `Erro ao salvar as alterações: ${descreverErroSupabase(error.message)}.` };
  }

  revalidatePath("/canhotos");
  revalidatePath("/");
  return { ok: true };
}
