import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, LogOut, PackageCheck } from "lucide-react";
import { EntregaMotoristaCard } from "@/components/motorista/EntregaMotoristaCard";
import { MotoristaAutoRefresh } from "@/components/motorista/MotoristaAutoRefresh";
import { MotoristaLocationTracker } from "@/components/motorista/MotoristaLocationTracker";
import { EmptyState } from "@/components/ui/EmptyState";
import { getEntregasDoMotorista } from "@/lib/data/entregas";
import { getMotoboyNome } from "@/lib/data/motoboys";
import { obterMotoboyIdDaSessao } from "@/lib/motorista-session";
import { sairMotorista } from "./actions";

export const dynamic = "force-dynamic";

function formatarDataHoje() {
  const data = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());

  return data.charAt(0).toUpperCase() + data.slice(1);
}

export default async function MotoristaPage() {
  const motoboyId = await obterMotoboyIdDaSessao();
  if (!motoboyId) redirect("/motorista/login");

  const [nome, entregas] = await Promise.all([
    getMotoboyNome(motoboyId).then((n) => n ?? "Motorista"),
    getEntregasDoMotorista(motoboyId),
  ]);

  const totalHoje = entregas.length;
  const entregues = entregas.filter(
    (entrega) => entrega.status === "entregue"
  ).length;
  const pendentes = totalHoje - entregues;
  const possuiEntregaEmRota = entregas.some(
    (entrega) => entrega.status === "pendente" && entrega.horaSaida !== null
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <MotoristaAutoRefresh />
      <MotoristaLocationTracker ativo={possuiEntregaEmRota} />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-md items-center justify-between gap-4 px-4 py-4">
          <div className="border-l-4 border-[#0A1F44] pl-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Canhoto Digital
            </p>
            <h1 className="text-lg font-bold tracking-tight text-[#0A1F44]">
              Minhas entregas
            </h1>
          </div>

          <form action={sairMotorista}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-[#0A1F44] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0A1F44]/90"
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-5">
        <div className="mb-5">
          <p className="text-sm text-slate-500">{formatarDataHoje()}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Olá, {nome}
          </h2>
        </div>

        <section className="grid grid-cols-2 gap-3">
          <div className="col-span-2 border border-transparent bg-linear-to-br from-[#F2B22E] to-[#DE6C09] p-4 text-white shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Entregas de hoje
                </p>
                <p className="mt-2 text-4xl font-bold leading-none">
                  {totalHoje}
                </p>
              </div>
              <PackageCheck className="size-8 opacity-90" />
            </div>
          </div>

          <div className="border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Pendentes
                </p>
                <p className="mt-2 text-3xl font-bold leading-none text-slate-900">
                  {pendentes}
                </p>
              </div>
              <span className="grid size-9 place-items-center bg-amber-500/10 text-amber-700">
                <Clock3 className="size-5" />
              </span>
            </div>
          </div>

          <div className="border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Entregues
                </p>
                <p className="mt-2 text-3xl font-bold leading-none text-slate-900">
                  {entregues}
                </p>
              </div>
              <span className="grid size-9 place-items-center bg-emerald-600/10 text-emerald-700">
                <CheckCircle2 className="size-5" />
              </span>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 border-l-4 border-[#0A1F44] pl-3">
            <h2 className="text-base font-bold text-[#0A1F44]">
              Entregas atribuídas
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Pedidos programados para hoje.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {entregas.length === 0 ? (
              <div className="border border-slate-200 bg-white shadow-sm">
                <EmptyState
                  compact
                  icon={PackageCheck}
                  title="Nenhuma entrega para hoje"
                  description="Quando uma entrega for atribuída a você, ela aparecerá nesta lista."
                />
              </div>
            ) : (
              entregas.map((entrega) => (
                <EntregaMotoristaCard key={entrega.id} entrega={entrega} />
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
