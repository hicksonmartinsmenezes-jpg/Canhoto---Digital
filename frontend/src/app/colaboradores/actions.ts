"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigirAdminAutenticado } from "@/lib/admin-auth";
import { checarRateLimit, RATE_LIMIT_ESTRITO } from "@/lib/rate-limit";
import { normalizarTelefone } from "@/lib/motorista-auth";
import { descreverErroSupabase } from "@/lib/erros-supabase";
import type { PapelColaborador, Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ColaboradorActionResult { ok: boolean; error?: string; }
export interface ColaboradorDados { nome: string; email: string; celular: string; cargo: string; papel: PapelColaborador; ativo: boolean; }
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOME_SETOR_PADRAO = "Expedição";

function mensagemErroEmailDuplicado(mensagem: string): string | null {
  if (mensagem.toLowerCase().includes("duplicate key")) return "Esse e-mail já está cadastrado para outro colaborador.";
  return null;
}

async function obterSetorPadrao(supabase: SupabaseClient<Database>): Promise<{ id: string | null; error?: string }> {
  const { data: existente, error: erroConsulta } = await supabase.from("setores").select("id").ilike("nome", NOME_SETOR_PADRAO).maybeSingle();
  if (erroConsulta) return { id: null, error: `Erro ao consultar o setor: ${descreverErroSupabase(erroConsulta.message)}.` };
  if (existente) return { id: existente.id };
  const { data: criado, error: erroCriacao } = await supabase.from("setores").insert({ nome: NOME_SETOR_PADRAO }).select("id").single();
  if (erroCriacao || !criado) return { id: null, error: `Erro ao criar o setor "${NOME_SETOR_PADRAO}": ${erroCriacao ? descreverErroSupabase(erroCriacao.message) : "erro desconhecido"}.` };
  return { id: criado.id };
}

function validarDados(dados: ColaboradorDados): { ok: true; nome: string; email: string; celular: string; cargo: string } | { ok: false; error: string } {
  const nome = dados.nome.trim();
  if (!nome) return { ok: false, error: "Informe o nome do colaborador." };
  const email = dados.email.trim();
  if (!email) return { ok: false, error: "Informe o e-mail do colaborador." };
  if (!REGEX_EMAIL.test(email)) return { ok: false, error: "Informe um e-mail válido." };
  const celular = normalizarTelefone(dados.celular);
  if (celular.length !== 10 && celular.length !== 11) return { ok: false, error: "Informe um celular válido, com DDD." };
  return { ok: true, nome, email, celular, cargo: dados.cargo.trim() };
}

export async function criarColaborador(dados: ColaboradorDados): Promise<ColaboradorActionResult> {
  if (!(await exigirAdminAutenticado())) return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  const limite = await checarRateLimit("criarColaborador");
  if (!limite.permitido) return { ok: false, error: "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo." };
  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: "O Supabase ainda não está configurado neste ambiente — confirme o .env.local." };
  const validado = validarDados(dados);
  if (!validado.ok) return { ok: false, error: validado.error };
  const setor = await obterSetorPadrao(supabase);
  if (setor.error) return { ok: false, error: setor.error };
  const { error } = await supabase.from("colaboradores").insert({ nome: validado.nome, email: validado.email, celular: validado.celular, setor_id: setor.id, cargo: validado.cargo || null, papel: dados.papel });
  if (error) return { ok: false, error: mensagemErroEmailDuplicado(error.message) ?? `Erro ao cadastrar: ${descreverErroSupabase(error.message)}.` };
  revalidatePath("/colaboradores");
  return { ok: true };
}

export async function atualizarColaborador(id: string, dados: ColaboradorDados): Promise<ColaboradorActionResult> {
  if (!(await exigirAdminAutenticado())) return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  const limite = await checarRateLimit("atualizarColaborador");
  if (!limite.permitido) return { ok: false, error: "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo." };
  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: "O Supabase ainda não está configurado neste ambiente — confirme o .env.local." };
  const validado = validarDados(dados);
  if (!validado.ok) return { ok: false, error: validado.error };
  const setor = await obterSetorPadrao(supabase);
  if (setor.error) return { ok: false, error: setor.error };
  const { error } = await supabase.from("colaboradores").update({ nome: validado.nome, email: validado.email, celular: validado.celular, setor_id: setor.id, cargo: validado.cargo || null, papel: dados.papel, ativo: dados.ativo }).eq("id", id);
  if (error) return { ok: false, error: mensagemErroEmailDuplicado(error.message) ?? `Erro ao salvar: ${descreverErroSupabase(error.message)}.` };
  revalidatePath("/colaboradores");
  return { ok: true };
}

export async function excluirColaborador(id: string): Promise<ColaboradorActionResult> {
  if (!(await exigirAdminAutenticado())) return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  const limite = await checarRateLimit("excluirColaborador", RATE_LIMIT_ESTRITO);
  if (!limite.permitido) return { ok: false, error: "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo." };
  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: "O Supabase ainda não está configurado neste ambiente — confirme o .env.local." };
  const { error } = await supabase.from("colaboradores").delete().eq("id", id);
  if (error) {
    const referenciado = error.message.toLowerCase().includes("foreign key");
    return { ok: false, error: referenciado ? "Esse colaborador já está referenciado em outros registros — desative em vez de excluir." : `Erro ao excluir: ${descreverErroSupabase(error.message)}.` };
  }
  revalidatePath("/colaboradores");
  return { ok: true };
}
