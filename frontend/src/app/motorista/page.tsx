// Tela inicial (logada) do app do motorista (Issue #5, sub-issue #29) — só
// prova que a sessão/middleware funcionam de ponta a ponta. A lista de
// entregas do dia e as ações "Iniciar entrega"/"Confirmar entrega" são
// escopo da sub-issue #30, não desta.

import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { obterMotoboyIdDaSessao } from "@/lib/motorista-session";
import { getMotoboyNome } from "@/lib/data/motoboys";
import { sairMotorista } from "./actions";

export default async function MotoristaPage() {
  const motoboyId = await obterMotoboyIdDaSessao();
  // O middleware (@/middleware) já bloqueia essa rota sem sessão válida —
  // este redirect é só uma segunda camada de segurança (ex.: se o
  // middleware não rodar por algum motivo de config de deploy).
  if (!motoboyId) redirect("/motorista/login");

  const nome = (await getMotoboyNome(motoboyId)) ?? "Motorista";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Canhoto Digital
            </p>
            <h1 className="text-xl font-bold text-[#0A1F44]">Olá, {nome}</h1>
          </div>
          <form action={sairMotorista}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <p className="text-sm text-slate-500">
            A lista de entregas do dia chega na próxima etapa. Por enquanto,
            este acesso confirma que o login e a proteção das rotas do app
            do motorista já funcionam.
          </p>
        </div>
      </div>
    </div>
  );
}
