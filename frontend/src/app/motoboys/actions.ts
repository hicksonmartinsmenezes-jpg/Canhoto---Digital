"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigirAdminAutenticado } from "@/lib/admin-auth";
import { checarRateLimit, RATE_LIMIT_ESTRITO } from "@/lib/rate-limit";
import { gerarPin, hashPin, normalizarTelefone } from "@/lib/motorista-auth";
import { descreverErroSupabase } from "@/lib/erros-supabase";

export interface MotoboyActionResult {
  ok: boolean;
  error?: string;
}

function mensagemErroTelefoneDuplicado(mensagem: string): string | null {
  if (mensagem.toLowerCase().includes("duplicate key")) {
    return "Esse telefone já está cadastrado para outro motorista.";
  }
  return null;
}

export async function criarMotoboy(nome: string, telefone: string): Promise<MotoboyActionResult> {
  if (!(await exigirAdminAutenticado())) return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  const limite = await checarRateLimit("criarMotoboy");
  if (!limite.permitido) return { ok: false, error: "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo." };
  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: "O Supabase ainda não está configurado neste ambiente — confirme o .env.local." };
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) return { ok: false, error: "Informe o nome do motoboy." };
  const telefoneLimpo = normalizarTelefone(telefone);
  const { error } = await supabase.from("motoboys").insert({ nome: nomeLimpo, telefone: telefoneLimpo || null });
  if (error) return { ok: false, error: mensagemErroTelefoneDuplicado(error.message) ?? `Erro ao cadastrar: ${descreverErroSupabase(error.message)}.` };
  revalidatePath("/motoboys");
  return { ok: true };
}

export async function atualizarMotoboy(id: string, dados: { nome: string; telefone: string; ativo: boolean }): Promise<MotoboyActionResult> {
  if (!(await exigirAdminAutenticado())) return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  const limite = await checarRateLimit("atualizarMotoboy");
  if (!limite.permitido) return { ok: false, error: "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo." };
  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: "O Supabase ainda não está configurado neste ambiente — confirme o .env.local." };
  const nomeLimpo = dados.nome.trim();
  if (!nomeLimpo) return { ok: false, error: "Informe o nome do motoboy." };
  const telefoneLimpo = normalizarTelefone(dados.telefone);
  const { error } = await supabase.from("motoboys").update({ nome: nomeLimpo, telefone: telefoneLimpo || null, ativo: dados.ativo }).eq("id", id);
  if (error) return { ok: false, error: mensagemErroTelefoneDuplicado(error.message) ?? `Erro ao salvar: ${descreverErroSupabase(error.message)}.` };
  revalidatePath("/motoboys");
  revalidatePath("/canhotos");
  return { ok: true };
}

export async function excluirMotoboy(id: string): Promise<MotoboyActionResult> {
  if (!(await exigirAdminAutenticado())) return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  const limite = await checarRateLimit("excluirMotoboy", RATE_LIMIT_ESTRITO);
  if (!limite.permitido) return { ok: false, error: "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo." };
  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: "O Supabase ainda não está configurado neste ambiente — confirme o .env.local." };
  const { error } = await supabase.from("motoboys").delete().eq("id", id);
  if (error) {
    const referenciado = error.message.toLowerCase().includes("foreign key");
    return { ok: false, error: referenciado ? "Esse motoboy já tem entregas registradas — desative em vez de excluir." : `Erro ao excluir: ${descreverErroSupabase(error.message)}.` };
  }
  revalidatePath("/motoboys");
  return { ok: true };
}

export interface GerarPinResult extends MotoboyActionResult {
  pin?: string;
}

export async function gerarPinMotoboy(id: string): Promise<GerarPinResult> {
  if (!(await exigirAdminAutenticado())) return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  const limite = await checarRateLimit("gerarPinMotoboy", RATE_LIMIT_ESTRITO);
  if (!limite.permitido) return { ok: false, error: "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo." };
  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: "O Supabase ainda não está configurado neste ambiente — confirme o .env.local." };
  const { data: motoboy, error: erroConsulta } = await supabase.from("motoboys").select("telefone").eq("id", id).maybeSingle();
  if (erroConsulta || !motoboy) return { ok: false, error: "Motorista não encontrado." };
  if (!motoboy.telefone) return { ok: false, error: "Cadastre o telefone do motorista antes de gerar o PIN." };
  const pin = gerarPin();
  const { error } = await supabase.from("motoboys").update({ pin_hash: hashPin(pin) }).eq("id", id);
  if (error) return { ok: false, error: `Erro ao gerar o PIN: ${descreverErroSupabase(error.message)}.` };
  revalidatePath("/motoboys");
  return { ok: true, pin };
}
