// Camada de acesso a dados reais de Motoboys (Supabase) — hoje usada só para
// alimentar a sugestão de motoboy no wizard "Adicionar Entrega". Ver
// claude/modelo-de-dados-site.md para o schema.

import { createAdminClient } from "@/lib/supabase/admin";

export interface MotoboyOption {
  id: string;
  nome: string;
}

export async function getMotoboys(): Promise<MotoboyOption[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("motoboys")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");

  if (error || !data) return [];
  return data;
}
