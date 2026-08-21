import "server-only";
import { cookies } from "next/headers";
import {
  MOTORISTA_COOKIE_NAME,
  MOTORISTA_SESSAO_DURACAO_MS,
  criarTokenSessao,
  verificarTokenSessao,
} from "@/lib/motorista-session-core";

// Wrapper de sessão do app do motorista pra uso em Server Actions/Server
// Components (usa `next/headers`, que não existe no middleware — o
// middleware usa @/lib/motorista-session-core direto com a API de cookies
// do NextRequest/NextResponse). Ver esse arquivo para o formato do token e
// a escolha de Web Crypto em vez de `node:crypto`.
//
// Sem `MOTORISTA_SESSION_SECRET` configurado, login fica indisponível (em
// vez de cair num segredo padrão inseguro) — diferente do
// @/lib/supabase/admin, que devolve "vazio" quando faltam variáveis, aqui é
// um caminho de autenticação e prefere falhar fechado.
function obterSegredo(): string | null {
  return process.env.MOTORISTA_SESSION_SECRET || null;
}

export async function definirCookieSessaoMotorista(
  motoboyId: string
): Promise<boolean> {
  const segredo = obterSegredo();
  if (!segredo) return false;

  const token = await criarTokenSessao(motoboyId, segredo, Date.now());
  const cookieStore = await cookies();
  cookieStore.set(MOTORISTA_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(MOTORISTA_SESSAO_DURACAO_MS / 1000),
  });
  return true;
}

export async function obterMotoboyIdDaSessao(): Promise<string | null> {
  const segredo = obterSegredo();
  if (!segredo) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(MOTORISTA_COOKIE_NAME)?.value;
  if (!token) return null;

  return verificarTokenSessao(token, segredo, Date.now());
}

export async function encerrarSessaoMotorista(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(MOTORISTA_COOKIE_NAME);
}
