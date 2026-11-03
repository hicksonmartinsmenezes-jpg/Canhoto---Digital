import "server-only";

import { cookies } from "next/headers";
import {
  COLABORADOR_COOKIE_NAME,
  COLABORADOR_SESSAO_DURACAO_MS,
  criarTokenSessaoColaborador,
  verificarTokenSessaoColaborador,
  type SessaoColaboradorVerificada,
} from "@/lib/colaborador-session-core";

function obterSegredo(): string | null {
  return process.env.COLABORADOR_SESSION_SECRET || null;
}

export async function definirCookieSessaoColaborador(
  colaboradorId: string,
  setorId: string | null
): Promise<boolean> {
  const segredo = obterSegredo();
  if (!segredo) return false;

  const token = await criarTokenSessaoColaborador(
    colaboradorId,
    setorId,
    segredo,
    Date.now()
  );
  const cookieStore = await cookies();

  cookieStore.set(COLABORADOR_COOKIE_NAME, token, {
    httpOnly: true,
    // Em produção, o Canhoto é servido pelo Caddy via HTTPS. Em desenvolvimento
    // local, HTTP continua permitido para acesso por IP da rede da loja.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(COLABORADOR_SESSAO_DURACAO_MS / 1000),
  });

  return true;
}

export async function obterSessaoColaborador(): Promise<SessaoColaboradorVerificada | null> {
  const segredo = obterSegredo();
  if (!segredo) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(COLABORADOR_COOKIE_NAME)?.value;
  if (!token) return null;

  return verificarTokenSessaoColaborador(token, segredo, Date.now());
}

export async function encerrarSessaoColaborador(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COLABORADOR_COOKIE_NAME);
}
