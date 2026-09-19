"use server";

// Server Actions da área logada do app do motorista.
//
// A identidade do motorista é sempre derivada da sessão assinada e validada
// no banco pela camada `motorista-authorization`. O client nunca informa
// qual motorista está autenticado.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { checarRateLimit } from "@/lib/rate-limit";
import { descreverErroSupabase } from "@/lib/erros-supabase";
import {
  ERRO_MOTORISTA_SESSAO,
  motoristaPodeAcessarEntrega,
} from "@/lib/motorista-authorization";
import { encerrarSessaoMotorista } from "@/lib/motorista-session";

export async function sairMotorista(): Promise<void> {
  await encerrarSessaoMotorista();
  redirect("/motorista/login");
}

export interface AcaoEntregaResult {
  ok: boolean;
  error?: string;
}

const ERRO_SUPABASE =
  "O Supabase ainda não está configurado neste ambiente — confirme o .env.local.";

export async function iniciarEntrega(
  entregaId: string
): Promise<AcaoEntregaResult> {
  const limite = await checarRateLimit("iniciarEntrega");
  if (!limite.permitido) {
    return {
      ok: false,
      error: "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const acesso = await motoristaPodeAcessarEntrega(entregaId);
  if (!acesso) return { ok: false, error: ERRO_MOTORISTA_SESSAO };

  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: ERRO_SUPABASE };

  const { data, error } = await supabase
    .from("entregas")
    .update({ hora_saida: new Date().toISOString() })
    .eq("id", entregaId)
    .eq("motoboy_id", acesso.motoboyId)
    .eq("status", "pendente")
    .is("hora_saida", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: `Erro ao iniciar a entrega: ${descreverErroSupabase(error.message)}.` };
  }
  if (!data) {
    return { ok: false, error: "Entrega não encontrada ou já iniciada." };
  }

  revalidatePath("/motorista");
  return { ok: true };
}

export async function confirmarEntrega(
  entregaId: string
): Promise<AcaoEntregaResult> {
  const limite = await checarRateLimit("confirmarEntrega");
  if (!limite.permitido) {
    return {
      ok: false,
      error: "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const acesso = await motoristaPodeAcessarEntrega(entregaId);
  if (!acesso) return { ok: false, error: ERRO_MOTORISTA_SESSAO };

  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: ERRO_SUPABASE };

  const { data, error } = await supabase
    .from("entregas")
    .update({ cliente_assinou_em: new Date().toISOString(), status: "entregue" })
    .eq("id", entregaId)
    .eq("motoboy_id", acesso.motoboyId)
    .eq("status", "pendente")
    .not("hora_saida", "is", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: `Erro ao confirmar a entrega: ${descreverErroSupabase(error.message)}.` };
  }
  if (!data) {
    return {
      ok: false,
      error: "Entrega não encontrada ou ainda não iniciada.",
    };
  }

  revalidatePath("/motorista");
  return { ok: true };
}
