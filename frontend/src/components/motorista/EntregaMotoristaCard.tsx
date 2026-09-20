"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Loader2,
  MapPin,
  Navigation,
  Truck,
  UserRound,
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

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
      <div
        className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${
          entregue
            ? "border-emerald-100 bg-emerald-50/70"
            : emRota
              ? "border-[#F2B22E]/30 bg-[#F2B22E]/10"
              : "border-[#0A1F44]/10 bg-[#0A1F44]/5"
        }`}
      >
        <div
          className={`inline-flex items-center gap-2 text-sm font-extrabold ${
            entregue
              ? "text-emerald-700"
              : emRota
                ? "text-[#DE6C09]"
                : "text-[#0A1F44]"
          }`}
        >
          {entregue ? (
            <CheckCircle2 className="size-5" />
          ) : emRota ? (
            <Navigation className="size-5" />
          ) : (
            <Clock3 className="size-5" />
          )}
          {entregue
            ? "Entrega concluída"
            : emRota
              ? "Entrega em rota"
              : "Aguardando saída"}
        </div>

        <span
          className={`rounded-full px-3 py-1.5 text-sm font-black ${
            entregue
              ? "bg-emerald-100 text-emerald-700"
              : emRota
                ? "bg-[#F2B22E]/15 text-[#DE6C09]"
                : "bg-[#0A1F44]/10 text-[#0A1F44]"
          }`}
        >
          {entrega.numero}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-[#0A1F44]">
            <UserRound className="size-6" />
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-extrabold tracking-tight text-[#0A1F44]">
              {entrega.clienteNome}
            </h3>

            {entrega.endereco && (
              <div className="mt-2 flex items-start gap-2 text-sm leading-5 text-slate-500">
                <MapPin className="mt-0.5 size-4 shrink-0 text-slate-500" />
                <span>
                  {entrega.endereco}
                  {entrega.cep ? ` · CEP ${entrega.cep}` : ""}
                </span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 font-extrabold text-slate-700">
                <CircleDollarSign className="size-5 text-[#0A1F44]" />
                {entrega.valor}
              </span>
              <span className="hidden h-5 w-px bg-slate-200 sm:block" />
              <span className="font-semibold">
                {FORMA_PAGAMENTO_LABEL[entrega.formaPagamento]}
              </span>
            </div>

            {entregue && horaEntrega && (
              <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-600">
                <Clock3 className="size-4" />
                Entregue às {horaEntrega}
              </p>
            )}
          </div>
        </div>

        {erro && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {erro}
          </div>
        )}

        {entregue ? (
          <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-700">
            <CheckCircle2 className="size-5" />
            Entrega finalizada
          </div>
        ) : emRota ? (
          <div className="mt-5 space-y-3">
            {entrega.endereco && (
              <button
                type="button"
                onClick={abrirRota}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#0A1F44]/20 bg-[#0A1F44]/5 px-4 py-3 text-sm font-extrabold text-[#0A1F44] transition hover:bg-[#FFD200]/15"
              >
                <Navigation className="size-4" />
                Abrir rota no Waze
              </button>
            )}

            <details className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <summary className="flex cursor-pointer list-none items-center justify-center gap-2 px-4 py-3 text-sm font-extrabold text-[#0A1F44]">
                <CheckCircle2 className="size-4" />
                Concluir entrega
              </summary>
              <div className="border-t border-slate-200 bg-white p-3">
                <ComprovanteEntregaForm entregaId={entrega.id} />
              </div>
            </details>
          </div>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={executar}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0A1F44] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#102b5d] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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
    </article>
  );
}
