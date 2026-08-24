"use client";

// Página de confirmação do link de login por e-mail (Issue #48). Não
// consome o token sozinha ao carregar (só lê a query string) — exige um
// clique real no botão, que dispara @/app/auth/confirm/actions (ver
// comentário lá sobre por quê: verificadores automáticos de link nos
// e-mails consomem o token de um GET simples, fazendo o link chegar
// "expirado" pro usuário de verdade).

import { useState, useTransition } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { confirmarLogin } from "./actions";

export default function ConfirmarAcessoPage() {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    const next = params.get("next") ?? "/";

    if (!tokenHash || !type) {
      setErro("Link de acesso inválido.");
      return;
    }

    setErro(null);
    startTransition(async () => {
      // Em caso de sucesso, a Server Action já faz o redirect — só chega
      // aqui de volta quando dá erro.
      const resultado = await confirmarLogin(tokenHash, type, next);
      setErro(resultado.error ?? "Não foi possível confirmar o acesso.");
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <h1 className="text-xl font-bold text-[#0A1F44]">Canhoto Digital</h1>
        <p className="mt-1 text-sm text-slate-500">Confirmar acesso</p>

        <p className="mt-6 text-sm text-slate-600">
          Clique no botão abaixo pra concluir o login.
        </p>

        {erro && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {erro}
          </div>
        )}

        <button
          type="button"
          disabled={pending}
          onClick={confirmar}
          className="mt-6 inline-flex w-full items-center justify-center gap-1.5 bg-[#0A1F44] px-5 py-3 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-[#0A1F44]/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Confirmando...
            </>
          ) : (
            <>
              <ShieldCheck className="size-4" />
              Confirmar entrada
            </>
          )}
        </button>
      </div>
    </div>
  );
}
