"use server";

// Server Actions: operações administrativas de Entregas.

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigirAdminAutenticado } from "@/lib/admin-auth";
import { checarRateLimit, RATE_LIMIT_ESTRITO } from "@/lib/rate-limit";
import { descreverErroSupabase } from "@/lib/erros-supabase";

export interface ExcluirEntregaResult {
  ok: boolean;
  error?: string;
}

export async function excluirEntrega(id: string): Promise<ExcluirEntregaResult> {
  if (!(await exigirAdminAutenticado())) {
    return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  }

  const limite = await checarRateLimit("excluirEntrega", RATE_LIMIT_ESTRITO);
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

  const { error } = await supabase.from("entregas").delete().eq("id", id);

  if (error) {
    return { ok: false, error: `Erro ao excluir a entrega: ${descreverErroSupabase(error.message)}.` };
  }

  revalidatePath("/canhotos");
  revalidatePath("/");
  return { ok: true };
}

export interface ConferirCaixaResult {
  ok: boolean;
  error?: string;
}

export async function conferirCaixa(
  entregaId: string,
  colaboradorId: string
): Promise<ConferirCaixaResult> {
  if (!(await exigirAdminAutenticado())) {
    return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  }

  const limite = await checarRateLimit("conferirCaixa");
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

  if (!colaboradorId) {
    return { ok: false, error: "Selecione quem conferiu o caixa." };
  }

  const { data, error } = await supabase
    .from("entregas")
    .update({
      caixa_id: colaboradorId,
      caixa_confirmou_em: new Date().toISOString(),
    })
    .eq("id", entregaId)
    .is("caixa_confirmou_em", null)
    .select("id");

  if (error) {
    return { ok: false, error: `Erro ao confirmar a conferência: ${descreverErroSupabase(error.message)}.` };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Essa entrega já foi conferida por outra pessoa." };
  }

  revalidatePath("/canhotos");
  revalidatePath("/");
  return { ok: true };
}
