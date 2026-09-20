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

  const motoboyId = await obterMotoboyIdDaSessao();
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
        className="mx-auto w-full max-w-xl px-4 pb-28 pt-6 sm:px-5"
      >
        <header className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-500">
              {formatarDataHoje()}
            </p>
            <h1 className="mt-1 text-[30px] font-black leading-tight tracking-tight text-[#071A3D]">
              Olá, {nome} <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-2 text-base font-medium text-slate-500">
              Bora fazer mais entregas hoje!
            </p>
          </div>

          <details className="group relative shrink-0">
            <summary
              aria-label="Abrir menu"
              className="grid size-11 cursor-pointer list-none place-items-center rounded-full border border-slate-200 bg-white text-[#0A1F44] shadow-sm transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden"
            >
              <MoreVertical className="size-5" />
            </summary>

            <div className="absolute right-0 top-[52px] z-50 w-36 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
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
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.07)]">
              <div className="grid grid-cols-3">
                <div className="px-3 py-5 sm:px-5">
                  <span className="grid size-10 place-items-center rounded-full bg-blue-50 text-blue-600">
                    <Package className="size-5" />
                  </span>
                  <p className="mt-3 text-xs font-bold text-slate-500 sm:text-sm">
                    Entregas
                  </p>
                  <p className="mt-1 text-3xl font-black leading-none text-[#071A3D]">
                    {totalHoje}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-400 sm:text-xs">
                    no dia de hoje
                  </p>
                </div>

                <div className="border-x border-slate-200 px-3 py-5 sm:px-5">
                  <span className="grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="size-5" />
                  </span>
                  <p className="mt-3 text-xs font-bold text-slate-500 sm:text-sm">
                    Concluídas
                  </p>
                  <p className="mt-1 text-3xl font-black leading-none text-[#071A3D]">
                    {entregues}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-400 sm:text-xs">
                    no dia de hoje
                  </p>
                </div>

                <div className="px-3 py-5 sm:px-5">
                  <span className="grid size-10 place-items-center rounded-full bg-orange-50 text-orange-600">
                    <Clock3 className="size-5" />
                  </span>
                  <p className="mt-3 text-xs font-bold text-slate-500 sm:text-sm">
                    Pendentes
                  </p>
                  <p className="mt-1 text-3xl font-black leading-none text-[#071A3D]">
                    {pendentes}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-400 sm:text-xs">
                    no dia de hoje
                  </p>
                </div>
              </div>
            </section>

            <a
              href="#entregas-hoje"
              className="mt-5 block rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5 shadow-[0_10px_30px_rgba(16,185,129,0.08)] transition hover:bg-emerald-50"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="size-6 text-emerald-600" />
                  <h2 className="text-lg font-extrabold text-[#071A3D]">
                    Progresso do dia
                  </h2>
                </div>
                <span className="text-xl font-black text-emerald-600">
                  {progresso}%
                </span>
              </div>

              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width]"
                  style={{ width: `${progresso}%` }}
                />
              </div>

              <p className="mt-4 text-sm font-medium text-slate-500">
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
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#071A3D]">
                Minha conta
              </h2>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.07)]">
              <div className="flex items-center gap-4 border-b border-slate-100 p-5">
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#0A1F44] text-white">
                  <UserRound className="size-7" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xl font-black text-[#071A3D]">
                    {nome}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                    <ShieldCheck className="size-4" />
                    Motorista ativo
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-slate-100 px-2 py-5 text-center">
                <div>
                  <p className="text-2xl font-black text-[#071A3D]">
                    {totalHoje}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Hoje
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-black text-emerald-600">
                    {entregues}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Concluídas
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-black text-orange-600">
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-600 transition hover:bg-red-100"
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
