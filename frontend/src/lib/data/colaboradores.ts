// Camada de acesso a dados reais de Colaboradores (Supabase) — hoje usada só
// para alimentar o seletor "Quem conferiu" na ação de Conferência de Caixa
// (Issue #9). A tela /colaboradores ainda usa dados de exemplo
// (@/lib/colaboradores-mock) — não mexemos nela aqui, só criamos a leitura
// real que faltava. Ver claude/modelo-de-dados-site.md para o schema.

import { createAdminClient } from "@/lib/supabase/admin";

export interface ColaboradorOption {
  id: string;
  nome: string;
}

export async function getColaboradores(): Promise<ColaboradorOption[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("colaboradores")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");

  if (error || !data) return [];
  return data;
}
