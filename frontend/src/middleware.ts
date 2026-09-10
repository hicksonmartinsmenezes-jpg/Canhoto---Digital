import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  MOTORISTA_COOKIE_NAME,
  verificarTokenSessao,
} from "@/lib/motorista-session-core";

// Aviso de bypass (ver mais abaixo) só uma vez por processo, pra não
// poluir o terminal do `npm run dev` a cada requisição.
let avisoBypassDevMostrado = false;

// Login do motorista (PIN de 4 dígitos, ver motorista-session-core.ts) e
// login do Portal Admin (Supabase Auth, e-mail/senha — Issue #48) são dois
// sistemas de sessão independentes, cada um protegendo sua própria árvore
// de rotas: /motorista/* segue usando o cookie assinado do PIN (lógica
// inalterada abaixo); todo o resto do site agora exige uma sessão válida
// do Supabase Auth, redirecionando pra /login quando não houver — antes
// disso, TODAS as rotas do admin (Dashboard, Entregas, Motoristas,
// Veículos etc.) ficavam completamente abertas pra qualquer pessoa com o
// link.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/motorista")) {
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

  // Portal Admin (tudo que não é /motorista). Segue a receita oficial do
  // @supabase/ssr pra middleware — ver
  // https://supabase.com/docs/guides/auth/server-side/nextjs — repassando
  // cookies entre a requisição e a resposta pra manter o token sempre
  // atualizado (getUser() já renova quando necessário). Roda no Edge
  // runtime por padrão; @supabase/ssr é compatível (sem node:crypto).
  let response = NextResponse.next({ request });

  // Bypass SÓ em dev local (Issue #48) — o e-mail de login (Supabase OTP,
  // sem SMTP próprio configurado ainda) tem um limite de envio bem baixo,
  // travando quem tá só mexendo em outras telas do admin. NODE_ENV vem
  // "production" automaticamente de `next build`/`next start` (e de
  // qualquer deploy padrão) — nunca depende de nada configurado à mão,
  // então isso não vaza pra produção. Remover quando o SMTP próprio
  // estiver configurado (ver Issue #48) e o login puder ser usado sem
  // esbarrar nesse limite no dia a dia.
  if (process.env.NODE_ENV !== "production") {
    if (!avisoBypassDevMostrado) {
      avisoBypassDevMostrado = true;
      console.warn(
        "[middleware] Login do Portal Admin DESATIVADO em dev (NODE_ENV != production) — Issue #48."
      );
    }
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem as variáveis do Supabase configuradas (ambiente novo, ainda sem
  // projeto real — mesma checagem de @/lib/supabase/admin.ts), deixa
  // passar em vez de travar o site inteiro: não tem como validar sessão
  // nenhuma sem elas.
  if (!url || !anonKey || url.includes("SEU_PROJETO")) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // "/auth/*" fica de fora da exigência de sessão — é justamente onde o
  // link de login (Issue #48, @/app/auth/confirm/route.ts) cria a sessão;
  // exigir sessão ali criaria um loop (redireciona pro /login antes do
  // link conseguir logar).
  if (!user && pathname !== "/login" && !pathname.startsWith("/auth/")) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

// Roda em tudo, exceto assets estáticos internos do Next e arquivos
// públicos comuns (ícones/imagens) — sem isso, cada logo/ícone da Sidebar
// passaria pela verificação de sessão à toa.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
