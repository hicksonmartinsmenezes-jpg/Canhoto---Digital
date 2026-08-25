"use server";

// Server Actions da área logada do app do motorista (Issue #5, sub-issue
// #30) — "Iniciar entrega" e "Confirmar entrega", além do logout que já
// existia (sub-issue #29).
//
// Em todas as duas ações novas, o `motoboyId` vem só do cookie de sessão
// (@/lib/motorista-session) — nunca de um campo enviado pelo client. O
// `.eq("motoboy_id", motoboyId)` na query é o que garante que um motorista
// só consegue alterar as próprias entregas, mesmo que descubra/adivinhe o
// id de uma entrega de outro motorista.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { checarRateLimit } from "@/lib/rate-limit";
import { descreverErroSupabase } from "@/lib/erros-supabase";
import {
  encerrarSessaoMotorista,
  obterMotoboyIdDaSessao,
} from "@/lib/motorista-session";

export async function sairMotorista(): Promise<void> {
  await encerrarSessaoMotorista();
  redirect("/motorista/login");
}

export interface AcaoEntregaResult {
  ok: boolean;
  error?: string;
}

const ERRO_SESSAO = "Sessão expirada — faça login novamente.";
const ERRO_SUPABASE =
  "O Supabase ainda não está configurado neste ambiente — confirme o .env.local.";

// Grava `hora_saida` — só quando a entrega é do motorista logado, ainda
// está "pendente" e ainda não tem saída registrada (evita reiniciar uma
// entrega já em rota por um duplo clique/duas abas).
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

  const motoboyId = await obterMotoboyIdDaSessao();
  if (!motoboyId) return { ok: false, error: ERRO_SESSAO };

  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: ERRO_SUPABASE };

  const { data, error } = await supabase
    .from("entregas")
    .update({ hora_saida: new Date().toISOString() })
    .eq("id", entregaId)
    .eq("motoboy_id", motoboyId)
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

// Grava `cliente_assinou_em` e muda o status pra "entregue" — só quando a
// entrega é do motorista logado e já tem `hora_saida` (não dá pra confirmar
// uma entrega que nunca saiu pra rota).
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

  const motoboyId = await obterMotoboyIdDaSessao();
  if (!motoboyId) return { ok: false, error: ERRO_SESSAO };

  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: ERRO_SUPABASE };

  const { data, error } = await supabase
    .from("entregas")
    .update({ cliente_assinou_em: new Date().toISOString(), status: "entregue" })
    .eq("id", entregaId)
    .eq("motoboy_id", motoboyId)
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
