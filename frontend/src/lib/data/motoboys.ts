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

export interface MotoboyListItem {
  id: string;
  nome: string;
  ativo: boolean;
  entregasNoMes: number;
}

// Lista completa (ativos e inativos) para a tela de Motoristas, com a
// contagem de entregas no mês corrente — usada só como contexto na listagem,
// não é uma métrica de performance oficial ainda.
export async function getMotoboysList(): Promise<MotoboyListItem[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const inicioMes = new Date();
  inicioMes.setDate(1);
  const inicioMesStr = inicioMes.toISOString().slice(0, 10);

  const [motoboysRes, entregasRes] = await Promise.all([
    supabase.from("motoboys").select("id, nome, ativo").order("nome"),
    supabase
      .from("entregas")
      .select("motoboy_id")
      .gte("data", inicioMesStr)
      .not("motoboy_id", "is", null),
  ]);

  if (motoboysRes.error || !motoboysRes.data) return [];

  const contagem = new Map<string, number>();
  for (const e of entregasRes.data ?? []) {
    if (!e.motoboy_id) continue;
    contagem.set(e.motoboy_id, (contagem.get(e.motoboy_id) ?? 0) + 1);
  }

  return motoboysRes.data.map((m) => ({
    id: m.id,
    nome: m.nome,
    ativo: m.ativo,
    entregasNoMes: contagem.get(m.id) ?? 0,
  }));
}
