"use server";

// Server Action: edição de uma Entrega já cadastrada (inclui mudar a
// situação — pendente/entregue/cancelado — já que ainda não existem telas
// dedicadas para "saída"/"confirmação do cliente"). Mesma justificativa do
// cliente service-role das outras actions do módulo — ver comentário em
// @/lib/supabase/admin.

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMotoboyId } from "@/lib/supabase/motoboy-helpers";
import type { FormaPagamento, StatusEntrega } from "@/types/database";

export interface AtualizarEntregaInput {
  data: string;
  clienteNome: string;
  numeroPedido: string;
  numeroNfe: string;
  valorPagamento: number;
  formaPagamento: FormaPagamento | "";
  motoboyNome: string;
  horaSaida: string;
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

  const { id: motoboyId, error: erroMotoboy } = await resolveMotoboyId(
    supabase,
    input.motoboyNome
  );
  if (erroMotoboy) return { ok: false, error: erroMotoboy };

  const { error } = await supabase
    .from("entregas")
    .update({
      data: input.data,
      cliente_nome: clienteNome,
      numero_pedido: input.numeroPedido.trim() || null,
      numero_nfe: input.numeroNfe.trim() || null,
      valor_pagamento: input.valorPagamento,
      forma_pagamento: input.formaPagamento,
      hora_saida: input.horaSaida || null,
      motoboy_id: motoboyId,
      observacoes: input.observacoes.trim() || null,
      status: input.status,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: `Erro ao salvar as alterações: ${error.message}` };
  }

  revalidatePath("/canhotos");
  revalidatePath("/");
  return { ok: true };
}
