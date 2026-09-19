import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface UsuarioAdmin {
  id: string;
}

export interface AdminAutenticado {
  authUserId: string;
  colaboradorId: string | null;
}

async function obterUsuarioAdmin(): Promise<UsuarioAdmin | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return { id: user.id };
}

/**
 * Valida a sessão do Portal Admin no servidor.
 * Middleware protege a navegação, mas Server Actions podem ser chamadas
 * diretamente; operações administrativas sensíveis também devem validar
 * a sessão antes de usar o cliente service-role.
 */
export async function exigirAdminAutenticado(): Promise<boolean> {
  return Boolean(await obterUsuarioAdmin());
}

/**
 * Retorna a identidade real do usuário administrativo para trilhas de
 * auditoria. `authUserId` sempre vem da sessão Supabase; `colaboradorId`
 * só é preenchido quando esse login já está vinculado a um colaborador ativo.
 */
export async function obterAdminAutenticado(): Promise<AdminAutenticado | null> {
  const usuario = await obterUsuarioAdmin();
  if (!usuario) return null;

  const admin = createAdminClient();
  if (!admin) {
    return { authUserId: usuario.id, colaboradorId: null };
  }

  const { data, error } = await admin
    .from("colaboradores")
    .select("id")
    .eq("auth_user_id", usuario.id)
    .eq("ativo", true)
    .maybeSingle();

  return {
    authUserId: usuario.id,
    colaboradorId: error ? null : (data?.id ?? null),
  };
}
