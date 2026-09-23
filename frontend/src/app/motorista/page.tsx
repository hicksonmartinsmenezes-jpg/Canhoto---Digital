import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  LogOut,
  MapPin,
  Navigation,
  Package,
  Phone,
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
import { getMotoboyPerfil } from "@/lib/data/motoboys";
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
  if (valor === "historico" || valor === "perfil") {
    return valor;
  }

  return "entregas";
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

  const [perfil, entregas, historico] = await Promise.all([
    getMotoboyPerfil(motoboyId),
    getEntregasDoMotorista(motoboyId),
    view === "historico"
      ? getHistoricoDoMotorista(motoboyId, 100)
      : Promise.resolve([]),
  ]);

  const nome = perfil?.nome ?? "Motorista";
  const totalHoje = entregas.length;
  const entregues = entregas.filter(
    (entrega) => entrega.status === "entregue"
  ).length;
  const pendentes = entregas.filter(
    (entrega) =>
      entrega.status === "pendente" && entrega.horaSaida === null
  ).length;
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

      {view === "entregas" && (
        <header className="relative overflow-hidden bg-gradient-to-br from-[#0C3568] to-[#08264F] px-4 pb-4 pt-5 text-white">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full border border-white/5" />

          <div className="relative w-full">
            <div className="flex items-center justify-between gap-4">
              <p className="flex items-center gap-2 text-[12px] font-semibold text-white/70">
                <CalendarDays className="size-4" />
                {formatarDataHoje()}
              </p>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/rildon-express-logo-white.svg"
                alt="Rildon Express"
                className="h-5 w-auto max-w-[132px]"
              />
            </div>

            {proximaEntrega ? (
              <section className="mt-4 border-t border-white/15 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-9 place-items-center rounded-full bg-[#1F73F1] text-white">
                      {proximaEntrega.horaSaida ? (
                        <Navigation className="size-4" />
                      ) : (
                        <Package className="size-4" />
                      )}
                    </span>
                    <span className="text-xs font-black">
                      {proximaEntrega.horaSaida
                        ? "Entrega em andamento"
                        : "Próxima entrega"}
                    </span>
                  </div>

                  {proximaEntrega.horaSaida && (
                    <span className="rounded-full bg-[#1F73F1] px-2.5 py-1 text-[10px] font-black text-white">
                      Em rota
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <p className="text-lg font-black">
                    {proximaEntrega.clienteNome}
                  </p>
                  {proximaEntrega.endereco && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium leading-5 text-white/75">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" />
                      <span className="line-clamp-1">
                        {proximaEntrega.endereco}
                      </span>
                    </p>
                  )}
                </div>

                <Link
                  href={`/motorista/entregas/${proximaEntrega.id}`}
                  className="mt-4 flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white transition hover:text-white/80"
                >
                  <Navigation className="size-4" />
                  Ver entrega
                  <ChevronRight className="size-4" />
                </Link>
              </section>
            ) : (
              <section className="mt-4 flex items-center gap-3 border-t border-white/15 pt-4">
                <CheckCircle2 className="size-6 shrink-0 text-white/85" />
                <div>
                  <p className="text-sm font-black">Nenhuma entrega pendente</p>
                  <p className="mt-0.5 text-xs font-medium text-white/65">
                    Você está em dia com as entregas de hoje.
                  </p>
                </div>
              </section>
            )}
          </div>
        </header>
      )}

      {view === "perfil" && (
        <header className="bg-[#082B57] text-white">
          <div className="w-full px-4 py-4">
            {view === "perfil" && (
              <div className="flex items-center gap-4 py-1">
                <span className="grid size-16 shrink-0 place-items-center rounded-full border-2 border-white/70 bg-white text-[#0A2C5A]">
                  <UserRound className="size-8" />
                </span>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-[24px] font-black">{nome}</h1>
                  <p className="mt-0.5 text-sm font-medium text-white/65">
                    Motorista
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#15924A] px-2.5 py-1 text-[10px] font-black">
                  <CheckCircle2 className="size-3" />
                  Ativo
                </span>
              </div>
            )}
          </div>
        </header>
      )}

      <main className="w-full pb-28">
        {view === "entregas" && (
          <>
            <section className="border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-black text-[#0A1F44]">
                    Seu progresso de hoje
                  </h2>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {entregues} de {totalHoje}{" "}
                    {totalHoje === 1
                      ? "entrega concluída"
                      : "entregas concluídas"}
                  </p>
                </div>
                <span className="text-lg font-black text-[#0A1F44]">
                  {progresso}%
                </span>
              </div>

              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#1F73F1] transition-[width]"
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </section>

            <div className="border-b border-slate-200 bg-[#F5F7FB] px-4 py-3">
              <h2 className="text-[17px] font-black text-[#0A1F44]">
                Entregas de hoje
              </h2>
            </div>

            <div className="pt-3">
              <MotoristaEntregasHoje entregas={entregas} />
            </div>
          </>
        )}

        {view === "historico" && (
          <div className="pt-4">
            <MotoristaHistorico entregas={historico} />
          </div>
        )}

        {view === "perfil" && (
          <section className="bg-white">
            <div className="border-b border-slate-200 px-4 py-4">
              <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
                Nome
              </p>
              <p className="mt-1 text-base font-black text-[#0A1F44]">
                {nome}
              </p>
            </div>

            <div className="border-b border-slate-200 px-4 py-4">
              <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
                Função
              </p>
              <p className="mt-1 text-sm font-bold text-[#0A1F44]">
                Motorista
              </p>
            </div>

            {perfil?.telefone && (
              <div className="border-b border-slate-200 px-4 py-4">
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
                  Telefone
                </p>
                <a
                  href={`tel:${perfil.telefone.replace(/\D/g, "")}`}
                  className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-[#0A1F44]"
                >
                  <Phone className="size-4 text-[#315A8E]" />
                  {perfil.telefone}
                </a>
              </div>
            )}

            <div className="border-b border-slate-200 px-4 py-4">
              <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
                Status
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-[#15924A]">
                <CheckCircle2 className="size-4" />
                Ativo
              </p>
            </div>

            <div className="px-4 py-5">
              <form action={sairMotorista}>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  <LogOut className="size-4" />
                  Sair
                </button>
              </form>
            </div>
          </section>
        )}
      </main>

      <MotoristaBottomNav ativo={view} pendentes={pendentes} />
    </div>
  );
}
