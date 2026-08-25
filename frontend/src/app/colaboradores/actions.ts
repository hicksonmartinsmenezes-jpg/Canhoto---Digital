"use server";

// Server Actions: cadastro/edição/exclusão de Colaboradores (pessoas da
// empresa — quem cadastra entregas, confere caixa, etc.). Mesma
// justificativa do cliente service-role usada nas outras actions do site —
// ver comentário em @/lib/supabase/admin.
//
// Login (auth_user_id) fica fora do escopo desta tela por enquanto — o
// admin login em si (Issue #48/PR #49) ainda não foi validado
// ponta-a-ponta, e uma tela de convite/vínculo de usuário é trabalho
// futuro separado. E-mail já é obrigatório aqui porque é pra lá que vai o
// convite/login quando esse trabalho futuro existir.

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { checarRateLimit, RATE_LIMIT_ESTRITO } from "@/lib/rate-limit";
import { normalizarTelefone } from "@/lib/motorista-auth";
import { descreverErroSupabase } from "@/lib/erros-supabase";
import type { PapelColaborador, Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ColaboradorActionResult {
  ok: boolean;
  error?: string;
}

export interface ColaboradorDados {
  nome: string;
  email: string;
  celular: string;
  cargo: string;
  papel: PapelColaborador;
  ativo: boolean;
}

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Único setor que opera o sistema hoje (ver 20260821010000_add_motorista_auth_endereco.sql
// e a decisão em claude/ideias-decisoes-projeto.md) — a tela de Colaboradores
// não tem campo de Setor porque não há outra opção pra escolher; o cadastro
// resolve (ou recria, se por algum motivo a linha tiver sido apagada) essa
// linha em `setores` sozinho.
const NOME_SETOR_PADRAO = "Expedição";

// Traduz a violação da constraint `unique` de `colaboradores.email` numa
// mensagem que faz sentido pra quem está cadastrando, em vez do erro cru do
// Postgres.
function mensagemErroEmailDuplicado(mensagem: string): string | null {
  if (mensagem.toLowerCase().includes("duplicate key")) {
    return "Esse e-mail já está cadastrado para outro colaborador.";
  }
  return null;
}

async function obterSetorPadrao(
  supabase: SupabaseClient<Database>
): Promise<{ id: string | null; error?: string }> {
  const { data: existente, error: erroConsulta } = await supabase
    .from("setores")
    .select("id")
    .ilike("nome", NOME_SETOR_PADRAO)
    .maybeSingle();

  if (erroConsulta) {
    return { id: null, error: `Erro ao consultar o setor: ${descreverErroSupabase(erroConsulta.message)}.` };
  }
  if (existente) return { id: existente.id };

  const { data: criado, error: erroCriacao } = await supabase
    .from("setores")
    .insert({ nome: NOME_SETOR_PADRAO })
    .select("id")
    .single();

  if (erroCriacao || !criado) {
    return {
      id: null,
      error: `Erro ao criar o setor "${NOME_SETOR_PADRAO}": ${erroCriacao ? descreverErroSupabase(erroCriacao.message) : "erro desconhecido"}.`,
    };
  }
  return { id: criado.id };
}

// Valida os campos comuns a criar/atualizar e devolve os valores já
// normalizados, ou uma mensagem de erro pra devolver direto ao formulário.
function validarDados(
  dados: ColaboradorDados
):
  | { ok: true; nome: string; email: string; celular: string; cargo: string }
  | { ok: false; error: string } {
  const nome = dados.nome.trim();
  if (!nome) return { ok: false, error: "Informe o nome do colaborador." };

  const email = dados.email.trim();
  if (!email) return { ok: false, error: "Informe o e-mail do colaborador." };
  if (!REGEX_EMAIL.test(email)) {
    return { ok: false, error: "Informe um e-mail válido." };
  }

  const celular = normalizarTelefone(dados.celular);
  if (celular.length !== 10 && celular.length !== 11) {
    return { ok: false, error: "Informe um celular válido, com DDD." };
  }

  return { ok: true, nome, email, celular, cargo: dados.cargo.trim() };
}

export async function criarColaborador(
  dados: ColaboradorDados
): Promise<ColaboradorActionResult> {
  const limite = await checarRateLimit("criarColaborador");
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

  const validado = validarDados(dados);
  if (!validado.ok) return { ok: false, error: validado.error };

  const setor = await obterSetorPadrao(supabase);
  if (setor.error) return { ok: false, error: setor.error };

  const { error } = await supabase.from("colaboradores").insert({
    nome: validado.nome,
    email: validado.email,
    celular: validado.celular,
    setor_id: setor.id,
    cargo: validado.cargo || null,
    papel: dados.papel,
  });

  if (error) {
    return {
      ok: false,
      error:
        mensagemErroEmailDuplicado(error.message) ??
        `Erro ao cadastrar: ${descreverErroSupabase(error.message)}.`,
    };
  }

  revalidatePath("/colaboradores");
  return { ok: true };
}

export async function atualizarColaborador(
  id: string,
  dados: ColaboradorDados
): Promise<ColaboradorActionResult> {
  const limite = await checarRateLimit("atualizarColaborador");
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

  const validado = validarDados(dados);
  if (!validado.ok) return { ok: false, error: validado.error };

  const setor = await obterSetorPadrao(supabase);
  if (setor.error) return { ok: false, error: setor.error };

  const { error } = await supabase
    .from("colaboradores")
    .update({
      nome: validado.nome,
      email: validado.email,
      celular: validado.celular,
      setor_id: setor.id,
      cargo: validado.cargo || null,
      papel: dados.papel,
      ativo: dados.ativo,
    })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      error:
        mensagemErroEmailDuplicado(error.message) ??
        `Erro ao salvar: ${descreverErroSupabase(error.message)}.`,
    };
  }

  revalidatePath("/colaboradores");
  return { ok: true };
}

export async function excluirColaborador(
  id: string
): Promise<ColaboradorActionResult> {
  const limite = await checarRateLimit("excluirColaborador", RATE_LIMIT_ESTRITO);
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

  const { error } = await supabase.from("colaboradores").delete().eq("id", id);

  if (error) {
    // Sem ON DELETE CASCADE de propósito nas referências a colaboradores —
    // se algo já apontar pra esse registro, orienta desativar em vez de
    // excluir, igual ao padrão já usado em Motoristas.
    const referenciado = error.message.toLowerCase().includes("foreign key");
    return {
      ok: false,
      error: referenciado
        ? "Esse colaborador já está referenciado em outros registros — desative em vez de excluir."
        : `Erro ao excluir: ${descreverErroSupabase(error.message)}.`,
    };
  }

  revalidatePath("/colaboradores");
  return { ok: true };
}
