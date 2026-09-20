import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { StatusTreinamento } from "@/lib/treinamentos";

export interface TreinamentoProgressoItem {
  slug: string;
  status: Exclude<StatusTreinamento, "nao_iniciado">;
  iniciadoEm: string;
  concluidoEm: string | null;
}

export async function getTreinamentosProgresso(
  usuarioId: string
): Promise<TreinamentoProgressoItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("treinamento_progresso")
    .select("treinamento_slug, status, iniciado_em, concluido_em")
    .eq("usuario_id", usuarioId);

  if (error || !data) return [];

  return data.map((item) => ({
    slug: item.treinamento_slug,
    status: item.status,
    iniciadoEm: item.iniciado_em,
    concluidoEm: item.concluido_em,
  }));
}

export async function getTreinamentoProgresso(
  usuarioId: string,
  slug: string
): Promise<TreinamentoProgressoItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("treinamento_progresso")
    .select("treinamento_slug, status, iniciado_em, concluido_em")
    .eq("usuario_id", usuarioId)
    .eq("treinamento_slug", slug)
    .maybeSingle();

  if (error || !data) return null;

  return {
    slug: data.treinamento_slug,
    status: data.status,
    iniciadoEm: data.iniciado_em,
    concluidoEm: data.concluido_em,
  };
}
