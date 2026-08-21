"use client";

// Tela de login do app do motorista (Issue #5, sub-issue #29) — telefone +
// PIN de 4 dígitos (ver @/app/motorista/login/actions). Layout próprio,
// mobile-first, fora do Portal Admin (a Sidebar já se esconde em
// /motorista, ver @/components/layout/Sidebar).

import { useState, useTransition } from "react";
import { Loader2, LogIn } from "lucide-react";
import { maskPhoneInput } from "@/lib/format";
import { loginMotorista } from "./actions";

export default function MotoristaLoginPage() {
  const [telefone, setTelefone] = useState("");
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function entrar() {
    if (!telefone.trim()) {
      setErro("Informe o telefone cadastrado.");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setErro("Informe o PIN de 4 dígitos.");
      return;
    }

    setErro(null);
    startTransition(async () => {
      // Em caso de sucesso, a Server Action já faz o redirect pra
      // /motorista — só chega aqui de volta quando dá erro.
      const resultado = await loginMotorista(telefone, pin);
      setErro(resultado.error ?? "Não foi possível entrar.");
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-xl font-bold text-[#0A1F44]">Canhoto Digital</h1>
        <p className="mt-1 text-sm text-slate-500">Acesso do motorista</p>

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Telefone
            </label>
            <input
              type="text"
              inputMode="tel"
              placeholder="(00) 00000-0000"
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-400/15"
              value={telefone}
              onChange={(e) => setTelefone(maskPhoneInput(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-center text-2xl tracking-[0.5em] text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-400/15"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
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
          className="mt-6 inline-flex w-full items-center justify-center gap-1.5 bg-amber-500 px-5 py-3 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-amber-400 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
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
  );
}
