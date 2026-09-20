import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface AdminAutenticado {
  authUserId: string;
}

/**
 * Retorna a identidade autenticada do Portal Admin no servidor.
 * Mantém a mesma regra já usada pela main: uma sessão Supabase válida é
 * obrigatória antes de qualquer operação administrativa sensível.
 */
export async function obterAdminAutenticado(): Promise<AdminAutenticado | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return { authUserId: user.id };
}

export async function exigirAdminAutenticado(): Promise<boolean> {
  return Boolean(await obterAdminAutenticado());
}
