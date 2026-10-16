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
  Route,
  UserRound,
} from "lucide-react";
import { type MotoristaView } from "@/components/motorista/MotoristaBottomNav";
import { MotoristaTabs } from "@/components/motorista/MotoristaTabs";
import { MotoristaAutoRefresh } from "@/components/motorista/MotoristaAutoRefresh";
import { MotoristaAvisoEntregas } from "@/components/motorista/MotoristaAvisoEntregas";
import { MotoristaEntregasHoje } from "@/components/motorista/MotoristaEntregasHoje";
import { MotoristaEnvioPendente } from "@/components/motorista/MotoristaEnvioPendente";
import { MotoristaPushNativo } from "@/components/motorista/MotoristaPushNativo";
import { MotoristaPreparoOffline } from "@/components/motorista/MotoristaPreparoOffline";
import { MotoristaHistorico } from "@/components/motorista/MotoristaHistorico";
import { MotoristaLocationTracker } from "@/components/motorista/MotoristaLocationTracker";
import { MotoristaWakeLock } from "@/components/motorista/MotoristaWakeLock";
import {
  getEntregasDoMotorista,
  getHistoricoDoMotorista,
} from "@/lib/data/entregas";
import { getMotoboyPerfil } from "@/lib/data/motoboys";
import { getDistanciaLojaAteDestinoKm } from "@/lib/distancia-loja";
import { maskPhoneInput } from "@/lib/format";
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
    // As três abas são montadas de uma vez (troca instantânea no aparelho).
    getHistoricoDoMotorista(motoboyId, 100),
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

  // A distância depende de serviços externos (geocodificação/rotas). Não deixa
  // a tela esperar por eles: se não responder em 1,5 s mostra sem a distância
  // e o cálculo continua em segundo plano (fica em cache pra próxima
  // atualização).
  const distanciaAteDestino = proximaEntrega
    ? await Promise.race([
        getDistanciaLojaAteDestinoKm(proximaEntrega.id),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1_500)),
      ])
    : null;

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <MotoristaAutoRefresh />
      <MotoristaAvisoEntregas
        motoboyId={motoboyId}
        entregas={entregas.map((entrega) => ({
          id: entrega.id,
          numero: entrega.numero,
          clienteNome: entrega.clienteNome,
          status: entrega.status,
        }))}
      />
      <MotoristaPreparoOffline
        entregaIds={entregas
          .filter((entrega) => entrega.status === "pendente")
          .map((entrega) => entrega.id)}
      />
      <MotoristaLocationTracker ativo={possuiEntregaEmRota} />
      <MotoristaWakeLock ativo={possuiEntregaEmRota} />

      <MotoristaTabs
        inicial={view}
        pendentes={pendentes}
        cabecalhos={{
          entregas: (
        <header className="relative overflow-hidden bg-gradient-to-br from-[#0C3568] to-[#08264F] px-4 pb-4 pt-5 text-white">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full border border-white/5" />

          <div className="relative w-full">
            <div className="flex items-center justify-between gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/rildon-express-logo-white.svg"
                alt="Rildon Express"
                className="h-5 w-auto max-w-[132px]"
              />

              <p className="flex items-center gap-2 text-[12px] font-semibold text-white/70">
                <CalendarDays className="size-4" />
                {formatarDataHoje()}
              </p>
            </div>

            {proximaEntrega ? (
              <section className="mt-4 border-t border-white/15 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center text-white">
                      {proximaEntrega.horaSaida ? (
                        <Route className="size-5" />
                      ) : (
                        <Package className="size-5" />
                      )}
                    </span>
                    <span className="text-sm font-black leading-5">
                      {proximaEntrega.horaSaida
                        ? "Entrega em andamento"
                        : "Próxima entrega"}
                    </span>
                  </div>

                  {proximaEntrega.horaSaida && (
                    <span className="text-[11px] font-black text-white">
                      Em rota
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-normal leading-5 text-white/95">
                      {proximaEntrega.clienteNome}
                    </p>

                    {proximaEntrega.endereco && (
                      <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium leading-5 text-white/70">
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-white/55" />
                        <span className="line-clamp-2">
                          {proximaEntrega.endereco}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Sem distância calculada, não mostra nada (antes ficava "— km"). */}
                  {distanciaAteDestino !== null && (
                    <span className="shrink-0 pb-0.5 text-[15px] font-medium tabular-nums text-white/90">
                      {`${distanciaAteDestino.toLocaleString("pt-BR", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })} km`}
                    </span>
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
          ),
          perfil: (
        <header className="bg-[#082B57] text-white">
          <div className="w-full px-4 py-4">
            <>
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
              </div>
            </>
          </div>
        </header>
          ),
        }}
        conteudos={{
          entregas: (
          <>
            <MotoristaPushNativo />
            <MotoristaEnvioPendente />
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
          ),
          historico: (
          <div className="pt-4">
            <MotoristaHistorico entregas={historico} />
          </div>
          ),
          perfil: (
          <section className="bg-white">
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
                  {maskPhoneInput(perfil.telefone)}
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
          ),
        }}
      />
    </div>
  );
}
