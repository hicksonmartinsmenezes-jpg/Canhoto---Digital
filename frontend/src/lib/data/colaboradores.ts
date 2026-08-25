// Camada de acesso a dados reais de Colaboradores (Supabase) — tabela
// `colaboradores`, com o setor (tabela `setores`) resolvido pelo nome pra
// exibição. Ver claude/modelo-de-dados-site.md e a migração
// 20260818000000_init_schema.sql pro schema completo.

import type { PapelColaborador } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ColaboradorListItem {
  id: string;
  nome: string;
  email: string | null;
  // Nome do setor já resolvido (join) — "—" quando setor_id é nulo. A tela
  // hoje só tem "Expedição" cadastrado de verdade (única linha semeada em
  // `setores`), mas o campo aceita qualquer nome digitado — ver
  // encontrarOuCriarSetor em @/app/colaboradores/actions.
  setor: string | null;
  cargo: string | null;
  papel: PapelColaborador;
  ativo: boolean;
}

export async function getColaboradoresList(): Promise<ColaboradorListItem[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("colaboradores")
    .select("id, nome, email, cargo, papel, ativo, setor:setores(nome)")
    .order("nome");

  if (error || !data) return [];

  return data.map((c) => {
    // O join `setor:setores(nome)` vem tipado pelo supabase-js como array
    // (por não termos os tipos gerados reais, ver nota em types/database.ts)
    // mesmo sendo uma relação many-to-one — normaliza pro primeiro item.
    const setorRel = c.setor as { nome: string }[] | { nome: string } | null;
    const setorNome = Array.isArray(setorRel) ? setorRel[0]?.nome : setorRel?.nome;

    return {
      id: c.id,
      nome: c.nome,
      email: c.email,
      setor: setorNome ?? null,
      cargo: c.cargo,
      papel: c.papel,
      ativo: c.ativo,
    };
  });
}
