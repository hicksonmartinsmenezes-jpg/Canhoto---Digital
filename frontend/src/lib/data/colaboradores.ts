// Camada de acesso a dados reais de Colaboradores (Supabase) — tabela
// `colaboradores`. Ver claude/modelo-de-dados-site.md e a migração
// 20260818000000_init_schema.sql pro schema completo.

import type { PapelColaborador } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ColaboradorListItem {
  id: string;
  nome: string;
  email: string | null;
  celular: string | null;
  cargo: string | null;
  papel: PapelColaborador;
  ativo: boolean;
}

export async function getColaboradoresList(): Promise<ColaboradorListItem[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("colaboradores")
    .select("id, nome, email, celular, cargo, papel, ativo")
    .order("nome");

  if (error || !data) return [];

  return data.map((c) => ({
    id: c.id,
    nome: c.nome,
    email: c.email,
    celular: c.celular,
    cargo: c.cargo,
    papel: c.papel,
    ativo: c.ativo,
  }));
}
