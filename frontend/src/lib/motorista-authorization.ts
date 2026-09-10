import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { obterMotoboyIdDaSessao } from "@/lib/motorista-session";

export const ERRO_MOTORISTA_SESSAO = "Sessão expirada — faça login novamente.";

/**
 * Retorna a identidade do motorista a partir exclusivamente da sessão assinada
 * e confirma no banco que o cadastro ainda existe e continua ativo.
 *
 * A função é a fronteira de autorização da área do motorista: callers não
 * devem aceitar `motoboyId` vindo do client para definir quem está autenticado.
 */
export async function obterMotoristaAutorizado(): Promise<string | null> {
  const motoboyId = await obterMotoboyIdDaSessao();
  if (!motoboyId) return null;

  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("motoboys")
    .select("id")
    .eq("id", motoboyId)
    .eq("ativo", true)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}

/**
 * Garante que um registro pertence ao motorista autenticado.
 * A comparação é feita no servidor e deve acompanhar toda operação futura
 * que altere uma entrega em nome do motorista.
 */
export async function motoristaPodeAcessarEntrega(
  entregaId: string
): Promise<{ motoboyId: string } | null> {
  const motoboyId = await obterMotoristaAutorizado();
  if (!motoboyId) return null;

  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("entregas")
    .select("id")
    .eq("id", entregaId)
    .eq("motoboy_id", motoboyId)
    .maybeSingle();

  if (error || !data) return null;
  return { motoboyId };
}
