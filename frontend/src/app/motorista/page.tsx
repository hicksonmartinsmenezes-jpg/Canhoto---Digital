import type { ComponentType } from "react";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  LogOut,
  PackageCheck,
  RefreshCw,
  Truck,
} from "lucide-react";
import { obterMotoboyIdDaSessao } from "@/lib/motorista-session";
import { getMotoboyNome } from "@/lib/data/motoboys";
import { getEntregasDoMotorista } from "@/lib/data/entregas";
import { EntregaMotoristaCard } from "@/components/motorista/EntregaMotoristaCard";
import { sairMotorista } from "./actions";

function formatarDataHoje() {
  const data = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());

  return data.charAt(0).toUpperCase() + data.slice(1);
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
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
  const pendentes = entregas.filter(
    (entrega) => entrega.status !== "entregue"
  ).length;
  const dataHoje = formatarDataHoje();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:py-8">
      <div className="mx-auto max-w-md">
        <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0A1F44] via-[#15356C] to-[#234C96] p-5 text-white shadow-lg shadow-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-100/90">
                Canhoto Digital
              </p>

              <h1 className="mt-3 text-[1.75rem] font-bold leading-tight">
                Olá, {nome} <span aria-hidden>👋</span>
              </h1>

              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-50 ring-1 ring-white/10 backdrop-blur-sm">
                <CalendarDays className="size-4" />
                {dataHoje}
              </div>
            </div>

            <form action={sairMotorista}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
              >
                <LogOut className="size-4" />
                Sair
              </button>
            </form>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-blue-50/95">
            <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100/80">
                Status do app
              </p>
              <p className="mt-1 font-semibold">
                Online e pronto para novas entregas
              </p>
            </div>

            <div className="rounded-2xl bg-[#F59E0B] px-4 py-3 text-slate-950 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-800/70">
                Atualização
              </p>
              <p className="mt-1 font-semibold">
                Suas entregas aparecem automaticamente aqui
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-3 gap-3">
          <StatCard icon={PackageCheck} label="Hoje" value={totalHoje} />
          <StatCard icon={Truck} label="Pendentes" value={pendentes} />
          <StatCard icon={CheckCircle2} label="Entregues" value={entregues} />
        </section>

        <section className="mt-6">
          <div className="mb-3">
            <h2 className="text-base font-bold text-slate-900">
              Suas entregas
            </h2>
            <p className="text-sm text-slate-500">
              Acompanhe aqui o que precisa sair e o que já foi concluído.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {entregas.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <PackageCheck className="size-8" />
                </div>

                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  Tudo tranquilo por aqui
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Você não tem entregas programadas para hoje. Quando uma nova
                  entrega for atribuída a você, ela aparecerá automaticamente
                  nesta tela.
                </p>

                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  <RefreshCw className="size-3.5" />
                  Sistema online e aguardando novas entregas
                </div>
              </div>
            ) : (
              entregas.map((entrega) => (
                <EntregaMotoristaCard key={entrega.id} entrega={entrega} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
