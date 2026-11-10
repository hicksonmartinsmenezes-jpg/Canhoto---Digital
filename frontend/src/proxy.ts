import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  verificarTokenSessaoAdmin,
} from "@/lib/admin-session-core";
import {
  COLABORADOR_COOKIE_NAME,
  verificarTokenSessaoColaborador,
} from "@/lib/colaborador-session-core";
import {
  MOTORISTA_COOKIE_NAME,
  verificarTokenSessao,
} from "@/lib/motorista-session-core";
import { authBypassAtivo } from "@/lib/auth-bypass";
import { requisicaoEhPublicaMotorista } from "@/lib/public-motorista-host";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Hostnames públicos dos motoristas (hostname configurado ou Quick Tunnel
  // *.trycloudflare.com) nunca expõem o Portal Admin. A mesma instância Next.js
  // continua acessível internamente pelo IP/nome da máquina da loja.
  const hostPublicoMotorista = requisicaoEhPublicaMotorista(
    request.headers,
    process.env.PUBLIC_MOTORISTA_HOST
  );
  if (hostPublicoMotorista && !pathname.startsWith("/motorista")) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (pathname.startsWith("/motorista")) {
    // /motorista/offline é uma página fixa, sem dados: precisa abrir mesmo
    // sem sessão para o service worker guardá-la na instalação.
    if (pathname === "/motorista/login" || pathname === "/motorista/offline") {
      return NextResponse.next();
    }

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

  if (authBypassAtivo()) {
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

  // Colaborador com papel "gestor_setor" — acesso quase igual ao Admin nas
  // mesmas rotas, só que os dados que ele vê ficam escopados ao setor dele
  // (isso é feito em cada página/consulta via @/lib/sessao-operador, não
  // aqui no proxy — aqui só decide SE entra).
  const segredoColaborador = process.env.COLABORADOR_SESSION_SECRET;
  const tokenColaborador = request.cookies.get(COLABORADOR_COOKIE_NAME)?.value;
  const sessaoColaborador =
    segredoColaborador && tokenColaborador
      ? await verificarTokenSessaoColaborador(
          tokenColaborador,
          segredoColaborador,
          Date.now()
        )
      : null;

  // Login único (Usuário e Senha): quem já tem sessão, de admin ou de
  // colaborador, não precisa ver a tela de novo. A rota antiga de colaborador
  // só redireciona para /login.
  if (pathname === "/login" || pathname === "/colaborador/login") {
    if (usuarioAdminId || sessaoColaborador) {
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

  if (usuarioAdminId || sessaoColaborador) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    // "motorista-manifest.webmanifest" e "motorista-sw.js" precisam ficar de
    // fora: embora não comecem com "/motorista/", pathname.startsWith(
    // "/motorista") acima bate com esses nomes de arquivo também (mesmo
    // prefixo de string), o que forçaria sessão de motorista só pra buscar
    // o manifest/service worker — quebrando o "Instalar app" pra quem ainda
    // não logou (ex.: na própria tela /motorista/login, que precisa dos
    // dois acessíveis sem sessão).
    "/((?!_next/static|_next/image|favicon.ico|motorista-manifest\\.webmanifest|motorista-sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
