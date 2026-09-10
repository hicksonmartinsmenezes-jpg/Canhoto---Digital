import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Valida a sessão do Portal Admin no servidor.
 * Middleware protege a navegação, mas Server Actions podem ser chamadas
 * diretamente; operações administrativas sensíveis também devem validar
 * a sessão antes de usar o cliente service-role.
 */
export async function exigirAdminAutenticado(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return Boolean(user && !error);
}
