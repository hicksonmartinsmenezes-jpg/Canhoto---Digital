import { redirect } from "next/navigation";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  LogOut,
  MoreVertical,
  Package,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  MotoristaBottomNav,
  type MotoristaView,
} from "@/components/motorista/MotoristaBottomNav";
import { MotoristaAutoRefresh } from "@/components/motorista/MotoristaAutoRefresh";
import { MotoristaEntregasHoje } from "@/components/motorista/MotoristaEntregasHoje";
import { MotoristaHistorico } from "@/components/motorista/MotoristaHistorico";
import { MotoristaLocationTracker } from "@/components/motorista/MotoristaLocationTracker";
import {
  getEntregasDoMotorista,
  getHistoricoDoMotorista,
} from "@/lib/data/entregas";
import { getMotoboyNome } from "@/lib/data/motoboys";
import { obterMotoristaAutorizado } from "@/lib/motorista-authorization";
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

function resolverView(valor: string | undefined): MotoristaView {
  if (
    valor === "entregas" ||
    valor === "historico" ||
    valor === "perfil"
  ) {
    return valor;
  }

  return "inicio";
}

export default async function MotoristaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = resolverView(params.view);

  const motoboyId = await obterMotoristaAutorizado();
  if (!motoboyId) redirect("/motorista/login");

  const [nome, entregas, historico] = await Promise.all([
    getMotoboyNome(motoboyId).then((n) => n ?? "Motorista"),
    getEntregasDoMotorista(motoboyId),
    view === "historico"
      ? getHistoricoDoMotorista(motoboyId, 20)
      : Promise.resolve([]),
  ]);

  const totalHoje = entregas.length;
  const entregues = entregas.filter(
    (entrega) => entrega.status === "entregue"
  ).length;
  const pendentes = totalHoje - entregues;
  const progresso =
    totalHoje > 0 ? Math.round((entregues / totalHoje) * 100) : 0;
  const possuiEntregaEmRota = entregas.some(
    (entrega) => entrega.status === "pendente" && entrega.horaSaida !== null
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <MotoristaAutoRefresh />
      <MotoristaLocationTracker ativo={possuiEntregaEmRota} />

      <main
        id="inicio"
        className="w-full px-2 pb-24 pt-3 sm:px-3"
      >
        <header className="mb-3 flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {formatarDataHoje()}
            </p>
            <h1 className="mt-0.5 text-[23px] font-black leading-tight tracking-tight text-[#0A1F44]">
              Olá, {nome} <span aria-hidden="true">👋</span>
            </h1>
          </div>

          <details className="group relative shrink-0">
            <summary
              aria-label="Abrir menu"
              className="grid size-10 cursor-pointer list-none place-items-center rounded-full border border-slate-200 bg-white text-[#0A1F44] transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden"
            >
              <MoreVertical className="size-4.5" />
            </summary>

            <div className="absolute right-0 top-[46px] z-50 w-36 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5">
              <form action={sairMotorista}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <LogOut className="size-4" />
                  Sair
                </button>
              </form>
            </div>
          </details>
        </header>

        {view === "inicio" && (
          <>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="grid grid-cols-3 divide-x divide-slate-200">
                <div className="flex items-center gap-2.5 px-3 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#0A1F44]/8 text-[#0A1F44]">
                    <Package className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Entregas
                    </p>
                    <p className="mt-0.5 text-2xl font-black leading-none text-[#0A1F44]">
                      {totalHoje}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 px-3 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-700">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Concluídas
                    </p>
                    <p className="mt-0.5 text-2xl font-black leading-none text-[#0A1F44]">
                      {entregues}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 px-3 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
                    <Clock3 className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Pendentes
                    </p>
                    <p className="mt-0.5 text-2xl font-black leading-none text-[#0A1F44]">
                      {pendentes}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <a
              href="#entregas-hoje"
              className="mt-3 block rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-[0_6px_18px_rgba(10,31,68,0.05)] transition hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="size-5 text-[#0A1F44]" />
                  <h2 className="text-base font-extrabold text-[#0A1F44]">
                    Progresso do dia
                  </h2>
                </div>
                <span className="text-lg font-black text-[#0A1F44]">
                  {progresso}%
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#F2B22E] transition-[width]"
                  style={{ width: `${progresso}%` }}
                />
              </div>

              <p className="mt-2.5 text-xs font-semibold text-slate-500">
                {totalHoje === 0
                  ? "Nenhuma entrega programada para hoje"
                  : `${entregues} de ${totalHoje} ${totalHoje === 1 ? "entrega concluída" : "entregas concluídas"}`}
              </p>
            </a>

            <MotoristaEntregasHoje entregas={entregas} />
          </>
        )}

        {view === "entregas" && (
          <MotoristaEntregasHoje entregas={entregas} />
        )}

        {view === "historico" && (
          <MotoristaHistorico entregas={historico} />
        )}

        {view === "perfil" && (
          <section>
            <div className="mb-5">
              <p className="text-sm font-semibold text-slate-500">Perfil</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#0A1F44]">
                Minha conta
              </h2>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center gap-4 border-b border-slate-100 p-5">
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#0A1F44] text-white">
                  <UserRound className="size-7" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xl font-black text-[#0A1F44]">
                    {nome}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-slate-700">
                    <ShieldCheck className="size-4" />
                    Motorista ativo
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-slate-100 px-2 py-5 text-center">
                <div>
                  <p className="text-2xl font-black text-[#0A1F44]">
                    {totalHoje}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Hoje
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-700">
                    {entregues}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Concluídas
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-700">
                    {pendentes}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Pendentes
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 p-4">
                <form action={sairMotorista}>
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
                  >
                    <LogOut className="size-4" />
                    Sair da conta
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}
      </main>

      <MotoristaBottomNav ativo={view} />
    </div>
  );
}
