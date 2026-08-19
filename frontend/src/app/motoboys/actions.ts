"use server";

// Server Actions: cadastro/edição/exclusão de Motoristas (motoboys
// terceirizados). Mesma justificativa do cliente service-role usado nas
// outras actions do site — ver comentário em @/lib/supabase/admin.

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface MotoboyActionResult {
  ok: boolean;
  error?: string;
}

export async function criarMotoboy(nome: string): Promise<MotoboyActionResult> {
  const supabase = createAdminClient();
  if (!supabase) {
    return {
      ok: false,
      error:
        "O Supabase ainda não está configurado neste ambiente — confirme o .env.local.",
    };
  }

  const nomeLimpo = nome.trim();
  if (!nomeLimpo) return { ok: false, error: "Informe o nome do motoboy." };

  const { error } = await supabase.from("motoboys").insert({ nome: nomeLimpo });
  if (error) return { ok: false, error: `Erro ao cadastrar: ${error.message}` };

  revalidatePath("/motoboys");
  return { ok: true };
}

export async function atualizarMotoboy(
  id: string,
  dados: { nome: string; ativo: boolean }
): Promise<MotoboyActionResult> {
  const supabase = createAdminClient();
  if (!supabase) {
    return {
      ok: false,
      error:
        "O Supabase ainda não está configurado neste ambiente — confirme o .env.local.",
    };
  }

  const nomeLimpo = dados.nome.trim();
  if (!nomeLimpo) return { ok: false, error: "Informe o nome do motoboy." };

  const { error } = await supabase
    .from("motoboys")
    .update({ nome: nomeLimpo, ativo: dados.ativo })
    .eq("id", id);

  if (error) return { ok: false, error: `Erro ao salvar: ${error.message}` };

  revalidatePath("/motoboys");
  revalidatePath("/canhotos");
  return { ok: true };
}

export async function excluirMotoboy(id: string): Promise<MotoboyActionResult> {
  const supabase = createAdminClient();
  if (!supabase) {
    return {
      ok: false,
      error:
        "O Supabase ainda não está configurado neste ambiente — confirme o .env.local.",
    };
  }

  const { error } = await supabase.from("motoboys").delete().eq("id", id);

  if (error) {
    // FK de entregas.motoboy_id não tem ON DELETE CASCADE de propósito —
    // não queremos apagar entregas junto. Nesse caso orientamos a desativar.
    const referenciado = error.message.toLowerCase().includes("foreign key");
    return {
      ok: false,
      error: referenciado
        ? "Esse motoboy já tem entregas registradas — desative em vez de excluir."
        : `Erro ao excluir: ${error.message}`,
    };
  }

  revalidatePath("/motoboys");
  return { ok: true };
}
