"use client";

// Tela de login do Portal Web Admin (Issue #48) — link de acesso por
// e-mail (Supabase Auth "Magic Link", ver @/app/login/actions e
// @/app/auth/confirm/route.ts). Digita o e-mail, chega um link no e-mail,
// clica e já entra — sem senha nem código pra digitar. Mesmo padrão visual
// da tela de login do motorista (@/app/motorista/login/page.tsx: card
// centralizado), com a cor de marca do Portal Admin (azul-marinho da
// Sidebar, `#0A1F44`).

import { useEffect, useState, useTransition } from "react";
import { Loader2, Mail } from "lucide-react";
import { enviarLinkLogin } from "./actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [pending, startTransition] = useTransition();

  // Lê a query string direto do navegador (em vez de useSearchParams) pra
  // não exigir um <Suspense> em volta desta página só por causa disso —
  // /login já é renderizada dinamicamente, não há nada pra pré-gerar aqui.
  // Precisa ser um useEffect mesmo (não um inicializador preguiçoso do
  // useState): o servidor não tem acesso a `window`, então o HTML
  // renderizado no servidor sempre parte de "sem erro" — se o cliente
  // calculasse esse valor já no primeiro render (via useState(() => ...)),
  // ia divergir do HTML do servidor sempre que a URL tivesse
  // `?erro=link-invalido`, causando hydration mismatch (bug real visto em
  // produção, Issue #48). Setar depois do mount, aqui, evita isso.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("erro") === "link-invalido") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- necessário pra evitar o hydration mismatch descrito acima
      setErro("O link de acesso é inválido ou já expirou. Peça um novo abaixo.");
    }
  }, []);

  function enviarLink() {
    if (!email.trim()) {
      setErro("Informe seu e-mail.");
      return;
    }

    setErro(null);
    startTransition(async () => {
      const resultado = await enviarLinkLogin(email);
      if (resultado.ok) {
        setEnviado(true);
      } else {
        setErro(resultado.error ?? "Não foi possível enviar o link de acesso.");
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-xl font-bold text-[#0A1F44]">Canhoto Digital</h1>
        <p className="mt-1 text-sm text-slate-500">Acesso administrativo</p>

        {enviado ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            Enviamos um link de acesso para <strong>{email.trim()}</strong>. Confira sua caixa
            de entrada (e o spam) e clique no link pra entrar.
          </div>
        ) : (
          <>
            <div className="mt-6">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                E-mail
              </label>
              <input
                type="email"
                placeholder="voce@rildon.com.br"
                autoFocus
                autoComplete="username"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-400/15"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") enviarLink();
                }}
              />
            </div>

            {erro && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {erro}
              </div>
            )}

            <button
              type="button"
              disabled={pending}
              onClick={enviarLink}
              className="mt-6 inline-flex w-full items-center justify-center gap-1.5 bg-[#0A1F44] px-5 py-3 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-[#0A1F44]/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="size-4" />
                  Enviar link de acesso
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
