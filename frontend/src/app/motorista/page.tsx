// Tela logada do app do motorista (Issue #5, sub-issue #30) — lista as
// entregas de hoje do motorista logado, com "Iniciar entrega" e "Confirmar
// entrega" por item (ver @/components/motorista/EntregaMotoristaCard e
// @/app/motorista/actions). Login e proteção de rota vieram na sub-issue
// #29 (@/lib/motorista-session, @/middleware).

import { redirect } from "next/navigation";
import { LogOut, PackageCheck } from "lucide-react";
import { obterMotoboyIdDaSessao } from "@/lib/motorista-session";
import { getMotoboyNome } from "@/lib/data/motoboys";
import { getEntregasDoMotorista } from "@/lib/data/entregas";
import { EntregaMotoristaCard } from "@/components/motorista/EntregaMotoristaCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { sairMotorista } from "./actions";

export default async function MotoristaPage() {
  const motoboyId = await obterMotoboyIdDaSessao();
  // O middleware (@/middleware) já bloqueia essa rota sem sessão válida —
  // este redirect é só uma segunda camada de segurança (ex.: se o
  // middleware não rodar por algum motivo de config de deploy).
  if (!motoboyId) redirect("/motorista/login");

  const [nome, entregas] = await Promise.all([
    getMotoboyNome(motoboyId).then((n) => n ?? "Motorista"),
    getEntregasDoMotorista(motoboyId),
  ]);

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

        <div className="mt-6 flex flex-col gap-4">
          {entregas.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <EmptyState
                icon={PackageCheck}
                title="Nenhuma entrega pra hoje"
                description="Quando o cadastro tiver entregas de hoje com você como motorista, elas aparecem aqui."
              />
            </div>
          ) : (
            entregas.map((entrega) => (
              <EntregaMotoristaCard key={entrega.id} entrega={entrega} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
