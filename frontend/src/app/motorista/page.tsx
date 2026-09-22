import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LogOut,
  MapPin,
  Navigation,
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
    weekday: "short",
    day: "2-digit",
    month: "long",
  })
    .format(new Date())
    .replace(".", "");

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

function criarLinkRota(endereco: string, cep: string) {
  const destino = [endereco, cep ? `CEP ${cep}` : ""]
    .filter(Boolean)
    .join(", ");

  return `https://waze.com/ul?q=${encodeURIComponent(destino)}&navigate=yes`;
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
  const proximaEntrega =
    entregas.find(
      (entrega) => entrega.status === "pendente" && entrega.horaSaida !== null
    ) ?? entregas.find((entrega) => entrega.status === "pendente");

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <MotoristaAutoRefresh />
      <MotoristaLocationTracker ativo={possuiEntregaEmRota} />

      <header className="relative overflow-hidden bg-gradient-to-br from-[#123E72] via-[#0C3568] to-[#08264F] px-5 pb-10 pt-5 text-white">
        <div className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full border border-white/5" />
        <div className="pointer-events-none absolute right-8 top-16 size-24 rounded-full border border-white/5" />

        <div className="relative mx-auto flex w-full max-w-xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-white/85">
              <CalendarDays className="size-4" />
              {formatarDataHoje()}
            </p>
            <h1 className="mt-2 truncate text-[32px] font-black leading-none tracking-tight">
              Olá, {nome} <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-3 text-base font-medium text-white/80">
              Hoje você tem {totalHoje} {totalHoje === 1 ? "entrega" : "entregas"}
            </p>
          </div>

          <Link
            href="/motorista?view=perfil"
            aria-label="Abrir perfil"
            className="flex shrink-0 items-center gap-2 text-white"
          >
            <span className="grid size-14 place-items-center rounded-full border-2 border-white/90 bg-white text-[#0A2C5A] shadow-lg">
              <UserRound className="size-7 stroke-[2.25]" />
            </span>
            <ChevronRight className="size-5" />
          </Link>
        </div>
      </header>

      <main
        id="inicio"
        className="relative mx-auto -mt-5 w-full max-w-xl px-4 pb-28"
      >
        {view === "inicio" && (
          <>
            <section className="grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl border border-[#CFE2FF] bg-[#EDF5FF] px-3 py-4 shadow-sm">
                <span className="grid size-10 place-items-center rounded-full bg-[#D7E8FF] text-[#1768D8]">
                  <Package className="size-5" />
                </span>
                <p className="mt-3 text-xs font-extrabold text-[#315A8E]">Total</p>
                <p className="mt-1 text-3xl font-black leading-none text-[#0A1F44]">
                  {totalHoje}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {totalHoje === 1 ? "entrega" : "entregas"}
                </p>
              </div>

              <div className="rounded-2xl border border-[#CEEBDD] bg-[#EEF9F3] px-3 py-4 shadow-sm">
                <span className="grid size-10 place-items-center rounded-full bg-[#D9F3E5] text-[#15924A]">
                  <CheckCircle2 className="size-5" />
                </span>
                <p className="mt-3 text-xs font-extrabold text-[#237848]">
                  Concluídas
                </p>
                <p className="mt-1 text-3xl font-black leading-none text-[#0A1F44]">
                  {entregues}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  de {totalHoje}
                </p>
              </div>

              <div className="rounded-2xl border border-[#F5DEC2] bg-[#FFF7ED] px-3 py-4 shadow-sm">
                <span className="grid size-10 place-items-center rounded-full bg-[#FFE8CC] text-[#F07A12]">
                  <Clock3 className="size-5" />
                </span>
                <p className="mt-3 text-xs font-extrabold text-[#D96B0B]">
                  Pendentes
                </p>
                <p className="mt-1 text-3xl font-black leading-none text-[#0A1F44]">
                  {pendentes}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  de {totalHoje}
                </p>
              </div>
            </section>

            <a
              href="#entregas-hoje"
              className="mt-4 block rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-[#0A1F44]">
                    Seu progresso de hoje
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {entregues} de {totalHoje}{" "}
                    {totalHoje === 1 ? "entrega concluída" : "entregas concluídas"}
                  </p>
                </div>
                <span className="text-2xl font-black text-[#0A1F44]">
                  {progresso}%
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#1F73F1] transition-[width]"
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </a>

            {proximaEntrega && (
              <section className="relative mt-5 overflow-hidden rounded-[24px] bg-gradient-to-br from-[#123E72] via-[#0D3569] to-[#08264F] p-5 text-white shadow-[0_16px_36px_rgba(8,38,79,0.18)]">
                <div className="pointer-events-none absolute -right-7 top-10 size-32 rounded-full border border-white/5" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#FF942E] px-3 py-1.5 text-xs font-black text-white">
                      <Clock3 className="size-4" />
                      {proximaEntrega.horaSaida ? "Entrega em rota" : "Próxima entrega"}
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-extrabold text-white/90">
                      Entrega {proximaEntrega.numero}
                    </span>
                  </div>

                  <h2 className="mt-5 text-[24px] font-black leading-tight">
                    {proximaEntrega.clienteNome}
                  </h2>

                  {proximaEntrega.endereco && (
                    <p className="mt-3 flex items-start gap-2 text-sm font-medium leading-5 text-white/85">
                      <MapPin className="mt-0.5 size-4 shrink-0" />
                      <span>
                        {proximaEntrega.endereco}
                        {proximaEntrega.cep ? ` · CEP ${proximaEntrega.cep}` : ""}
                      </span>
                    </p>
                  )}

                  {proximaEntrega.endereco ? (
                    <a
                      href={criarLinkRota(
                        proximaEntrega.endereco,
                        proximaEntrega.cep
                      )}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1F73F1] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#1767dc]"
                    >
                      <Navigation className="size-4" />
                      Ver rota
                      <ChevronRight className="size-4" />
                    </a>
                  ) : (
                    <a
                      href="#entregas-hoje"
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1F73F1] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#1767dc]"
                    >
                      Ver detalhes
                      <ChevronRight className="size-4" />
                    </a>
                  )}
                </div>
              </section>
            )}

            <MotoristaEntregasHoje entregas={entregas} />
          </>
        )}

        {view === "entregas" && (
          <div className="pt-8">
            <MotoristaEntregasHoje entregas={entregas} />
          </div>
        )}

        {view === "historico" && (
          <div className="pt-8">
            <MotoristaHistorico entregas={historico} />
          </div>
        )}

        {view === "perfil" && (
          <section className="pt-8">
            <div className="mb-5">
              <p className="text-sm font-semibold text-slate-500">Perfil</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#0A1F44]">
                Minha conta
              </h2>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-4 border-b border-slate-100 p-5">
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#0A2C5A] text-white">
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
                  <p className="text-2xl font-black text-[#15924A]">
                    {entregues}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Concluídas
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-black text-[#F07A12]">
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

      <MotoristaBottomNav ativo={view} pendentes={pendentes} />
    </div>
  );
}
