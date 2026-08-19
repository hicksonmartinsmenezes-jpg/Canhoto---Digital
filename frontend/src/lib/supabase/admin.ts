import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Cliente Supabase privilegiado (service role) — usado SÓ no servidor
// (Server Components / route handlers), nunca no browser.
//
// Por quê: as políticas de RLS do schema v2 (ver migration) hoje exigem um
// usuário autenticado (`auth.role() = 'authenticated'`), mas o site ainda
// não tem login real implementado (pendência registrada em
// claude/modelo-de-dados-site.md). Sem esse cliente, nenhuma leitura real
// funcionaria até o login existir.
//
// Quando o login real for construído, as páginas devem migrar para o
// cliente com sessão do usuário (`@/lib/supabase/server`), que respeita a
// RLS por pessoa logada — este client de service role deixa de ser
// necessário para leitura (pode continuar existindo para tarefas admin
// pontuais, mas não deve virar o caminho padrão de leitura da aplicação).
//
// Retorna `null` (em vez de lançar erro) quando as variáveis de ambiente
// ainda não foram configuradas — isso deixa o site funcionando com telas
// "vazias" (mesmo visual de um banco real sem dados) enquanto o projeto
// Supabase não é criado, em vez de quebrar o build.
let cachedClient: SupabaseClient<Database> | null | undefined;

export function createAdminClient(): SupabaseClient<Database> | null {
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey || url.includes("SEU_PROJETO")) {
    cachedClient = null;
    return null;
  }

  cachedClient = createSupabaseClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}
