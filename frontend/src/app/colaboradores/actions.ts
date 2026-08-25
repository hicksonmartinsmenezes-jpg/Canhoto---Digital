"use server";

// Server Actions: cadastro/edição/exclusão de Colaboradores (pessoas da
// empresa — quem cadastra entregas, confere caixa, etc.). Mesma
// justificativa do cliente service-role usada nas outras actions do site —
// ver comentário em @/lib/supabase/admin.
//
// Login (auth_user_id) fica fora do escopo desta tela por enquanto — o
// admin login em si (Issue #48/PR #49) ainda não foi validado
// ponta-a-ponta, e uma tela de convite/vínculo de usuário é trabalho
// futuro separado.

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { checarRateLimit, RATE_LIMIT_ESTRITO } from "@/lib/rate-limit";
import type { PapelColaborador, Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ColaboradorActionResult {
  ok: boolean;
  error?: string;
}

export interface ColaboradorDados {
  nome: string;
  email: string;
  setor: string;
  cargo: string;
  papel: PapelColaborador;
  ativo: boolean;
}

// Traduz a violação da constraint `unique` de `colaboradores.email` numa
// mensagem que faz sentido pra quem está cadastrando, em vez do erro cru do
// Postgres.
function mensagemErroEmailDuplicado(mensagem: string): string | null {
  if (mensagem.toLowerCase().includes("duplicate key")) {
    return "Esse e-mail já está cadastrado para outro colaborador.";
  }
  return null;
}

// A tela de Colaboradores não tem (e não deve ter, por ora — ver decisão em
// claude/ideias-decisoes-projeto.md) uma tela dedicada de gestão de
// Setores; hoje só existe "Expedição" semeado no banco. Em vez de travar o
// campo a esse único valor, o admin digita o nome do setor livremente e o
// servidor resolve (ou cria) a linha correspondente em `setores` — assim o
// FK `colaboradores.setor_id` continua íntegro sem precisar de um CRUD
// próprio agora.
async function encontrarOuCriarSetor(
  supabase: SupabaseClient<Database>,
  nomeSetor: string
): Promise<{ id: string | null; error?: string }> {
  const nomeLimpo = nomeSetor.trim();
  if (!nomeLimpo) return { id: null };

  const { data: existente, error: erroConsulta } = await supabase
    .from("setores")
    .select("id")
    .ilike("nome", nomeLimpo)
    .maybeSingle();

  if (erroConsulta) {
    return { id: null, error: `Erro ao consultar o setor: ${erroConsulta.message}` };
  }
  if (existente) return { id: existente.id };

  const { data: criado, error: erroCriacao } = await supabase
    .from("setores")
    .insert({ nome: nomeLimpo })
    .select("id")
    .single();

  if (erroCriacao || !criado) {
    return {
      id: null,
      error: `Erro ao criar o setor "${nomeLimpo}": ${erroCriacao?.message ?? "erro desconhecido"}`,
    };
  }
  return { id: criado.id };
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

  const nomeLimpo = dados.nome.trim();
  if (!nomeLimpo) return { ok: false, error: "Informe o nome do colaborador." };

  const emailLimpo = dados.email.trim();
  const cargoLimpo = dados.cargo.trim();

  const setor = await encontrarOuCriarSetor(supabase, dados.setor);
  if (setor.error) return { ok: false, error: setor.error };

  const { error } = await supabase.from("colaboradores").insert({
    nome: nomeLimpo,
    email: emailLimpo || null,
    setor_id: setor.id,
    cargo: cargoLimpo || null,
    papel: dados.papel,
  });

  if (error) {
    return {
      ok: false,
      error:
        mensagemErroEmailDuplicado(error.message) ??
        `Erro ao cadastrar: ${error.message}`,
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

  const nomeLimpo = dados.nome.trim();
  if (!nomeLimpo) return { ok: false, error: "Informe o nome do colaborador." };

  const emailLimpo = dados.email.trim();
  const cargoLimpo = dados.cargo.trim();

  const setor = await encontrarOuCriarSetor(supabase, dados.setor);
  if (setor.error) return { ok: false, error: setor.error };

  const { error } = await supabase
    .from("colaboradores")
    .update({
      nome: nomeLimpo,
      email: emailLimpo || null,
      setor_id: setor.id,
      cargo: cargoLimpo || null,
      papel: dados.papel,
      ativo: dados.ativo,
    })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      error:
        mensagemErroEmailDuplicado(error.message) ??
        `Erro ao salvar: ${error.message}`,
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
        : `Erro ao excluir: ${error.message}`,
    };
  }

  revalidatePath("/colaboradores");
  return { ok: true };
}
