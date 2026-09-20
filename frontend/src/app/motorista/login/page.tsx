"use client";

import { useState, useTransition } from "react";
import { Loader2, LockKeyhole, LogIn, Phone } from "lucide-react";
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
      const resultado = await loginMotorista(telefone, pin);
      setErro(resultado.error ?? "Não foi possível entrar.");
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm overflow-hidden border border-slate-200 bg-white shadow-sm">
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

        <div className="p-6">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Telefone
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(00) 00000-0000"
                autoFocus
                className="w-full border border-slate-300 bg-white py-3 pl-10 pr-3.5 text-base text-slate-700 outline-none transition focus:border-[#0A1F44] focus:ring-2 focus:ring-[#0A1F44]/10"
                value={telefone}
                onChange={(e) => setTelefone(maskPhoneInput(e.target.value))}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              PIN
            </label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={4}
                placeholder="••••"
                className="w-full border border-slate-300 bg-white py-3 pl-10 pr-3.5 text-lg tracking-[0.35em] text-slate-700 outline-none transition focus:border-[#0A1F44] focus:ring-2 focus:ring-[#0A1F44]/10"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") entrar();
                }}
              />
            </div>
          </div>

          {erro && (
            <div className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {erro}
            </div>
          )}

          <button
            type="button"
            disabled={pending}
            onClick={entrar}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-[#0A1F44] px-5 py-3 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-[#0A1F44]/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
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
