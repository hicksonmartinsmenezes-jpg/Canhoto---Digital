import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  verificarTokenSessaoAdmin,
} from "@/lib/admin-session-core";
import {
  MOTORISTA_COOKIE_NAME,
  verificarTokenSessao,
} from "@/lib/motorista-session-core";

function hostnameDaRequisicao(request: NextRequest): string {
  const encaminhado = request.headers.get("x-forwarded-host");
  const host = (encaminhado || request.headers.get("host") || "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
  return host;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Quando o Cloudflare Tunnel usar um hostname público específico para os
  // motoristas, esse host não expõe o Portal Admin. A mesma instância Next.js
  // continua acessível internamente pelo IP/nome da máquina da loja.
  const hostPublicoMotorista = process.env.PUBLIC_MOTORISTA_HOST
    ?.trim()
    .toLowerCase();
  if (
    hostPublicoMotorista &&
    hostnameDaRequisicao(request) === hostPublicoMotorista &&
    !pathname.startsWith("/motorista")
  ) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (pathname.startsWith("/motorista")) {
    if (pathname === "/motorista/login") return NextResponse.next();

    const segredo = process.env.MOTORISTA_SESSION_SECRET;
    const token = request.cookies.get(MOTORISTA_COOKIE_NAME)?.value;
    const motoboyId =
      segredo && token
        ? await verificarTokenSessao(token, segredo, Date.now())
        : null;

    if (!motoboyId) {
      return NextResponse.redirect(
        new URL("/motorista/login", request.url)
      );
    }

    return NextResponse.next();
  }

  if (
    process.env.CI === "true" &&
    process.env.E2E_AUTH_BYPASS === "true"
  ) {
    return NextResponse.next();
  }

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_BYPASS === "true"
  ) {
    return NextResponse.next();
  }

  const segredoAdmin = process.env.ADMIN_SESSION_SECRET;
  const tokenAdmin = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const usuarioAdminId =
    segredoAdmin && tokenAdmin
      ? await verificarTokenSessaoAdmin(
          tokenAdmin,
          segredoAdmin,
          Date.now()
        )
      : null;

  if (pathname === "/login") {
    if (usuarioAdminId) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!segredoAdmin) {
    return new NextResponse("Serviço temporariamente indisponível.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (!usuarioAdminId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
