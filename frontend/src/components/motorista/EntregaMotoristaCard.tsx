"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Loader2,
  MapPin,
  Navigation,
  Truck,
} from "lucide-react";
import { FORMA_PAGAMENTO_LABEL } from "@/lib/status";
import {
  atualizarLocalizacaoMotorista,
  iniciarEntrega,
} from "@/app/motorista/actions";
import { ComprovanteEntregaForm } from "@/components/motorista/ComprovanteEntregaForm";
import type { EntregaMotorista } from "@/lib/data/entregas";

function formatarHoraEntrega(valor: string | null): string | null {
  if (!valor) return null;

  return new Date(valor).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EntregaMotoristaCard({
  entrega,
}: {
  entrega: EntregaMotorista;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const emRota = entrega.status === "pendente" && entrega.horaSaida !== null;
  const entregue = entrega.status === "entregue";
  const horaEntrega = formatarHoraEntrega(entrega.clienteAssinouEm);

  function abrirRota() {
    if (!entrega.endereco) return;

    const destino = [entrega.endereco, entrega.cep ? `CEP ${entrega.cep}` : ""]
      .filter(Boolean)
      .join(", ");

    const params = new URLSearchParams({
      q: destino,
      navigate: "yes",
    });

    window.location.assign(`https://waze.com/ul?${params.toString()}`);
  }

  function registrarLocalizacaoAtual(): Promise<void> {
    if (!("geolocation" in navigator)) return Promise.resolve();

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (posicao) => {
          void atualizarLocalizacaoMotorista({
            latitude: posicao.coords.latitude,
            longitude: posicao.coords.longitude,
            precisaoMetros: posicao.coords.accuracy,
          }).finally(resolve);
        },
        () => resolve(),
        {
          enableHighAccuracy: true,
          maximumAge: 5_000,
          timeout: 15_000,
        }
      );
    });
  }

  function executar() {
    setErro(null);

    startTransition(async () => {
      const resultado = await iniciarEntrega(entrega.id);

      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível iniciar a entrega.");
        return;
      }

      await registrarLocalizacaoAtual();
      router.refresh();
    });
  }

  const statusLabel = entregue ? "Concluída" : emRota ? "Em rota" : "Pendente";

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3 px-4 py-4">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-full ${
            entregue
              ? "bg-[#E8F7EF] text-[#15924A]"
              : emRota
                ? "bg-[#EAF2FF] text-[#1768D8]"
                : "bg-[#FFF0DE] text-[#F07A12]"
          }`}
        >
          {entregue ? (
            <CheckCircle2 className="size-5" />
          ) : emRota ? (
            <Navigation className="size-5" />
          ) : (
            <Clock3 className="size-5" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-slate-500">
                Entrega {entrega.numero}
              </p>
              <h3 className="mt-1 truncate text-[17px] font-black leading-tight text-[#0A1F44]">
                {entrega.clienteNome}
              </h3>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                  entregue
                    ? "bg-[#E8F7EF] text-[#15924A]"
                    : emRota
                      ? "bg-[#EAF2FF] text-[#1768D8]"
                      : "bg-[#FFF0DE] text-[#D96B0B]"
                }`}
              >
                {statusLabel}
              </span>
              <ChevronRight className="size-4 text-slate-400" />
            </div>
          </div>

          {entrega.endereco && (
            <p className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-slate-500">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[#315A8E]" />
              <span>
                {entrega.endereco}
                {entrega.cep ? ` · CEP ${entrega.cep}` : ""}
              </span>
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1.5 font-extrabold text-slate-700">
              <CircleDollarSign className="size-4 text-[#315A8E]" />
              {entrega.valor}
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-slate-500">
              {FORMA_PAGAMENTO_LABEL[entrega.formaPagamento]}
            </span>
            {entregue && horaEntrega && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-semibold text-slate-500">
                  Entregue às {horaEntrega}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {erro && (
        <div className="mx-4 mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">
          {erro}
        </div>
      )}

      {!entregue && (
        <div className="border-t border-slate-100 px-4 py-3">
          {emRota ? (
            <div className="space-y-2.5">
              {entrega.endereco && (
                <button
                  type="button"
                  onClick={abrirRota}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1768D8] px-4 py-3 text-sm font-black text-white transition hover:bg-[#125DC2]"
                >
                  <Navigation className="size-4" />
                  Ver rota
                </button>
              )}

              <details className="group overflow-hidden rounded-xl border border-slate-200 bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-center gap-2 px-4 py-3 text-sm font-extrabold text-[#0A1F44]">
                  <CheckCircle2 className="size-4" />
                  Concluir entrega
                </summary>
                <div className="border-t border-slate-200 bg-slate-50 p-3">
                  <ComprovanteEntregaForm entregaId={entrega.id} />
                </div>
              </details>
            </div>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={executar}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0A2C5A] px-4 py-3 text-sm font-black text-white transition hover:bg-[#123E72] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Truck className="size-4" />
                  Iniciar entrega
                </>
              )}
            </button>
          )}
        </div>
      )}

      {entregue && (
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="flex items-center justify-center gap-2 rounded-xl bg-[#F0FAF5] px-4 py-2.5 text-sm font-extrabold text-[#15924A]">
            <CheckCircle2 className="size-4" />
            Entrega finalizada
          </div>
        </div>
      )}
    </article>
  );
}
