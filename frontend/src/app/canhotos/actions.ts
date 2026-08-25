"use server";

// Server Action: exclusão de uma Entrega, usada pela lista (/canhotos).
// Mesma justificativa do cliente service-role das outras actions do módulo
// — ver comentário em @/lib/supabase/admin.

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { checarRateLimit, RATE_LIMIT_ESTRITO } from "@/lib/rate-limit";
import { descreverErroSupabase } from "@/lib/erros-supabase";

export interface ExcluirEntregaResult {
  ok: boolean;
  error?: string;
}

export async function excluirEntrega(id: string): Promise<ExcluirEntregaResult> {
  const limite = await checarRateLimit("excluirEntrega", RATE_LIMIT_ESTRITO);
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

  const { error } = await supabase.from("entregas").delete().eq("id", id);

  if (error) {
    return { ok: false, error: `Erro ao excluir a entrega: ${descreverErroSupabase(error.message)}.` };
  }

  revalidatePath("/canhotos");
  revalidatePath("/");
  return { ok: true };
}

export interface ConferirCaixaResult {
  ok: boolean;
  error?: string;
}

// Server Action: dá funcionalidade real ao alerta "Pendente de conferência
// de caixa" do Dashboard (Issue #9) — até aqui só existia a contagem (via
// view `entregas_pendentes_conferencia`), sem nenhuma ação por trás. Marca
// a entrega como conferida, gravando quem conferiu (`caixa_id`) e quando
// (`caixa_confirmou_em`, timestamp do servidor).
//
// `colaboradorId` vem de um seletor manual no modal (ver
// ConferirCaixaAction) — não existe login real ainda, então não há como
// pegar isso de uma sessão (mesma situação de `cadastrado_por`, ver
// @/app/canhotos/nova/actions).
export async function conferirCaixa(
  entregaId: string,
  colaboradorId: string
): Promise<ConferirCaixaResult> {
  const limite = await checarRateLimit("conferirCaixa");
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

  if (!colaboradorId) {
    return { ok: false, error: "Selecione quem conferiu o caixa." };
  }

  // `.is("caixa_confirmou_em", null)` trava contra confirmar a mesma
  // entrega duas vezes (ex. dois cliques rápidos, ou dois admins olhando o
  // mesmo alerta ao mesmo tempo) — se já tiver sido conferida, o update não
  // atinge nenhuma linha.
  const { data, error } = await supabase
    .from("entregas")
    .update({
      caixa_id: colaboradorId,
      caixa_confirmou_em: new Date().toISOString(),
    })
    .eq("id", entregaId)
    .is("caixa_confirmou_em", null)
    .select("id");

  if (error) {
    return { ok: false, error: `Erro ao confirmar a conferência: ${descreverErroSupabase(error.message)}.` };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Essa entrega já foi conferida por outra pessoa." };
  }

  revalidatePath("/canhotos");
  revalidatePath("/");
  return { ok: true };
}
