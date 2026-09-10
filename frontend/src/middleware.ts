import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { MOTORISTA_COOKIE_NAME, verificarTokenSessao } from "@/lib/motorista-session-core";

let avisoBypassDevMostrado = false;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/motorista")) {
    if (pathname === "/motorista/login") return NextResponse.next();

    const segredo = process.env.MOTORISTA_SESSION_SECRET;
    const token = request.cookies.get(MOTORISTA_COOKIE_NAME)?.value;
    const motoboyId = segredo && token ? await verificarTokenSessao(token, segredo, Date.now()) : null;

    if (!motoboyId) return NextResponse.redirect(new URL("/motorista/login", request.url));
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  if (process.env.NODE_ENV !== "production") {
    if (!avisoBypassDevMostrado) {
      avisoBypassDevMostrado = true;
      console.warn("[middleware] Login do Portal Admin DESATIVADO em dev (NODE_ENV != production).");
    }
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail-closed: sem Supabase configurado, produção nunca libera o painel.
  if (!url || !anonKey || url.includes("SEU_PROJETO") || anonKey.includes("coloque_a_")) {
    return new NextResponse("Serviço temporariamente indisponível.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && pathname !== "/login" && !pathname.startsWith("/auth/")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && pathname === "/login") return NextResponse.redirect(new URL("/", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
