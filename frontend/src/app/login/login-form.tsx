"use client";

import { useState, useTransition } from "react";
import { Loader2, LockKeyhole, LogIn } from "lucide-react";
import { entrarAdmin } from "./actions";

type LoginFormProps = {
  initialError: string | null;
};

export default function LoginForm({ initialError }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(initialError);
  const [pending, startTransition] = useTransition();

  function entrar() {
    if (!email.trim()) {
      setErro("Informe seu e-mail.");
      return;
    }
    if (!senha) {
      setErro("Informe sua senha.");
      return;
    }

    setErro(null);
    startTransition(async () => {
      const resultado = await entrarAdmin(email, senha);
      if (resultado.ok) {
        window.location.assign("/");
        return;
      }
      setErro(resultado.error ?? "Não foi possível entrar.");
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#0A1F44] px-6 py-5">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/rildon-express-logo-white.svg"
              alt="Rildon Express"
              className="h-10 w-auto max-w-[230px]"
            />
          </div>
        </div>

        <div className="p-7">
          <div>
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
            />
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Senha
            </label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3.5 text-base text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-400/15"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") entrar();
                }}
              />
            </div>
          </div>

          {erro && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {erro}
            </div>
          )}

          <button
            type="button"
            disabled={pending}
            onClick={entrar}
            className="mt-6 inline-flex w-full items-center justify-center gap-1.5 bg-[#0A1F44] px-5 py-3 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-[#0A1F44]/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn className="size-4" />
                Entrar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
