"use server";

// Server Action: cadastro manual de uma nova Entrega (wizard "Adicionar
// Entrega"). Usa o cliente service-role (ver @/lib/supabase/admin) pelo
// mesmo motivo da camada de leitura: RLS hoje exige usuário autenticado e o
// site ainda não tem login real — quando existir, `cadastrado_por` deve
// passar a vir da sessão em vez de ficar nulo.

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormaPagamento } from "@/types/database";

export interface CriarEntregaInput {
  data: string;
  clienteNome: string;
  clienteTelefone: string;
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

  const { error } = await supabase.from("entregas").insert({
    data: input.data,
    cliente_nome: clienteNome,
    cliente_telefone: input.clienteTelefone.trim() || null,
    numero_pedido: input.numeroPedido.trim() || null,
    numero_nfe: input.numeroNfe.trim() || null,
    valor_pagamento: input.valorPagamento,
    forma_pagamento: input.formaPagamento,
    motoboy_id: input.motoboyId || null,
    observacoes: input.observacoes.trim() || null,
  });

  if (error) {
    return { ok: false, error: `Erro ao salvar a entrega: ${error.message}` };
  }

  revalidatePath("/canhotos");
  revalidatePath("/");
  return { ok: true };
}
