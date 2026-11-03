import "server-only";

import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSAO_DURACAO_MS,
  criarTokenSessaoAdmin,
  verificarTokenSessaoAdmin,
} from "@/lib/admin-session-core";

function obterSegredo(): string | null {
  return process.env.ADMIN_SESSION_SECRET || null;
}

export async function definirCookieSessaoAdmin(
  usuarioAdminId: string
): Promise<boolean> {
  const segredo = obterSegredo();
  if (!segredo) return false;

  const token = await criarTokenSessaoAdmin(
    usuarioAdminId,
    segredo,
    Date.now()
  );
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    // Em produção, o Canhoto é servido pelo Caddy via HTTPS. Em desenvolvimento
    // local, HTTP continua permitido para acesso por IP da rede da loja.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(ADMIN_SESSAO_DURACAO_MS / 1000),
  });

  return true;
}

export async function obterUsuarioAdminIdDaSessao(): Promise<string | null> {
  const segredo = obterSegredo();
  if (!segredo) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;

  return verificarTokenSessaoAdmin(token, segredo, Date.now());
}

export async function encerrarSessaoAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}
