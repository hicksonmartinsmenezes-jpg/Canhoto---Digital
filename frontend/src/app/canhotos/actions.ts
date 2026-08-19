"use server";

// Server Action: exclusão de uma Entrega, usada pela lista (/canhotos).
// Mesma justificativa do cliente service-role das outras actions do módulo
// — ver comentário em @/lib/supabase/admin.

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ExcluirEntregaResult {
  ok: boolean;
  error?: string;
}

export async function excluirEntrega(id: string): Promise<ExcluirEntregaResult> {
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
    return { ok: false, error: `Erro ao excluir a entrega: ${error.message}` };
  }

  revalidatePath("/canhotos");
  revalidatePath("/");
  return { ok: true };
}
