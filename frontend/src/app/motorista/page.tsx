import { redirect } from "next/navigation";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  LogOut,
  MoreVertical,
  Package,
} from "lucide-react";
import { MotoristaAutoRefresh } from "@/components/motorista/MotoristaAutoRefresh";
import { MotoristaEntregasHoje } from "@/components/motorista/MotoristaEntregasHoje";
import { MotoristaLocationTracker } from "@/components/motorista/MotoristaLocationTracker";
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
  const progresso =
    totalHoje > 0 ? Math.round((entregues / totalHoje) * 100) : 0;
  const possuiEntregaEmRota = entregas.some(
    (entrega) => entrega.status === "pendente" && entrega.horaSaida !== null
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <MotoristaAutoRefresh />
      <MotoristaLocationTracker ativo={possuiEntregaEmRota} />

      <main className="mx-auto w-full max-w-xl px-4 pb-10 pt-6 sm:px-5">
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
      </main>
    </div>
  );
}
