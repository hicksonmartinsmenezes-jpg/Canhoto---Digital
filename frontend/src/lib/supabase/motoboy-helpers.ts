import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Resolve (ou cadastra na hora) um motoboy a partir do nome digitado nos
// formulários de Entrega (cadastro e edição) — evita depender só da tela de
// Motoristas para o fluxo de entrega funcionar: se o nome já existir
// (case-insensitive), reaproveita; senão, cadastra um motoboy novo.
export async function resolveMotoboyId(
  supabase: SupabaseClient<Database>,
  nomeDigitado: string
): Promise<{ id: string | null; error?: string }> {
  const nome = nomeDigitado.trim();
  if (!nome) return { id: null };

  const { data: existente } = await supabase
    .from("motoboys")
    .select("id")
    .ilike("nome", nome)
    .limit(1)
    .maybeSingle();

  if (existente) return { id: existente.id };

  const { data: novo, error } = await supabase
    .from("motoboys")
    .insert({ nome })
    .select("id")
    .single();

  if (error || !novo) {
    return {
      id: null,
      error: "Não foi possível cadastrar o motoboy informado.",
    };
  }
  return { id: novo.id };
}
