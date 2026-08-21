import { NextResponse, type NextRequest } from "next/server";
import {
  MOTORISTA_COOKIE_NAME,
  verificarTokenSessao,
} from "@/lib/motorista-session-core";

// Protege todas as rotas /motorista/* (exceto a própria tela de login)
// exigindo um cookie de sessão válido — ver @/lib/motorista-session-core
// para o formato do token e @/lib/motorista-session para quem grava o
// cookie (Server Action de login em /motorista/login/actions.ts).
//
// Roda no Edge runtime por padrão (matcher abaixo restringe a /motorista,
// não afeta o resto do admin) — por isso a verificação do token usa só Web
// Crypto (sem node:crypto), ver motorista-session-core.ts.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/motorista/login") {
    return NextResponse.next();
  }

  const segredo = process.env.MOTORISTA_SESSION_SECRET;
  const token = request.cookies.get(MOTORISTA_COOKIE_NAME)?.value;

  const motoboyId =
    segredo && token
      ? await verificarTokenSessao(token, segredo, Date.now())
      : null;

  if (!motoboyId) {
    const loginUrl = new URL("/motorista/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/motorista/:path*"],
};
