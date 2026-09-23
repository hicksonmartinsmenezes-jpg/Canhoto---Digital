"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  Truck,
  UserRound,
} from "lucide-react";
import {
  atualizarLocalizacaoMotorista,
  iniciarEntrega,
} from "@/app/motorista/actions";
import { ComprovanteEntregaForm } from "@/components/motorista/ComprovanteEntregaForm";
import type { EntregaMotoristaDetalhe } from "@/lib/data/motorista-entregas";
import { FORMA_PAGAMENTO_LABEL } from "@/lib/status";

const MiniMapaEntrega = dynamic(
  () =>
    import("@/components/motorista/MiniMapaEntrega").then(
      (modulo) => modulo.MiniMapaEntrega
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-44 w-full animate-pulse rounded-2xl bg-slate-100" />
    ),
  }
);

export function EntregaMotoristaDetalheView({
  entrega,
}: {
  entrega: EntregaMotoristaDetalhe;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const entregue = entrega.status === "entregue";
  const emRota =
    entrega.status === "pendente" && entrega.horaSaida !== null;
  const pendente =
    entrega.status === "pendente" && entrega.horaSaida === null;

  function abrirRota() {
    const params = new URLSearchParams({
      navigate: "yes",
    });

    if (entrega.latitude !== null && entrega.longitude !== null) {
      params.set("ll", `${entrega.latitude},${entrega.longitude}`);
    } else {
      if (!entrega.enderecoRoteavel) return;
      params.set("q", entrega.enderecoRoteavel);
    }

    window.location.assign(`https://waze.com/ul?${params.toString()}`);
  }

  async function copiarEndereco() {
    if (!entrega.endereco || !navigator.clipboard) return;

    const endereco = [
      entrega.endereco,
      entrega.cep ? `CEP ${entrega.cep}` : "",
    ]
      .filter(Boolean)
      .join(", ");

    await navigator.clipboard.writeText(endereco);
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

  function iniciar() {
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
    <div className="space-y-4">
      {emRota && (
        <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0D3569] to-[#08264F] px-5 py-6 text-white shadow-[0_16px_34px_rgba(8,38,79,0.18)]">
          <div className="mx-auto grid size-28 place-items-center rounded-full border-[8px] border-[#1F73F1]/30 bg-[#0A2C5A]">
            <div className="grid size-20 place-items-center rounded-full border-4 border-[#1F73F1]">
              <Package className="size-8" />
            </div>
          </div>
          <p className="mt-3 text-center text-sm font-black">Em rota</p>

          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/8 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10">
              <UserRound className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black">
                {entrega.clienteNome}
              </p>
              {entrega.clienteTelefone && (
                <p className="mt-0.5 text-xs font-medium text-white/70">
                  {entrega.clienteTelefone}
                </p>
              )}
            </div>
            {entrega.clienteTelefone && (
              <a
                href={`tel:${entrega.clienteTelefone.replace(/\D/g, "")}`}
                aria-label="Ligar para o cliente"
                className="grid size-9 place-items-center rounded-full bg-white/10"
              >
                <Phone className="size-4" />
              </a>
            )}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                entregue
                  ? "bg-[#E8F7EF] text-[#15924A]"
                  : emRota
                    ? "bg-[#EAF2FF] text-[#1768D8]"
                    : "bg-[#FFF0DE] text-[#D96B0B]"
              }`}
            >
              {entregue ? "Concluída" : emRota ? "Em andamento" : "Pendente"}
            </span>
            <span className="text-xs font-black text-slate-500">
              {entrega.numero}
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#EEF4FC] text-[#0A2C5A]">
              <UserRound className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-black text-[#0A1F44]">
                {entrega.clienteNome}
              </p>
              {entrega.clienteTelefone && (
                <p className="mt-0.5 text-sm font-medium text-slate-500">
                  {entrega.clienteTelefone}
                </p>
              )}
            </div>
            {entrega.clienteTelefone && (
              <a
                href={`tel:${entrega.clienteTelefone.replace(/\D/g, "")}`}
                aria-label="Ligar para o cliente"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-[#EAF2FF] text-[#1768D8]"
              >
                <Phone className="size-4" />
              </a>
            )}
          </div>

          {entrega.endereco && (
            <div className="flex items-start gap-3 px-5 py-4">
              <MapPin className="mt-1 size-5 shrink-0 text-[#315A8E]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-5 text-[#0A1F44]">
                  {entrega.endereco}
                </p>
                {entrega.cep && (
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    CEP {entrega.cep}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={copiarEndereco}
                aria-label="Copiar endereço"
                className="grid size-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-50"
              >
                <Copy className="size-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 px-5 py-4">
            <CircleDollarSign className="size-5 shrink-0 text-[#315A8E]" />
            <div className="flex-1">
              <p className="text-sm font-black text-[#0A1F44]">
                {entrega.valor}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                {FORMA_PAGAMENTO_LABEL[entrega.formaPagamento]}
              </p>
            </div>
          </div>

          {(entrega.numeroPedido ||
            entrega.numeroNfe ||
            entrega.observacoes) && (
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-black text-[#0A1F44]">
                <Package className="size-4" />
                Pedido / observações
              </div>

              <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                {entrega.numeroPedido && (
                  <p>
                    Pedido:{" "}
                    <span className="font-bold text-slate-700">
                      {entrega.numeroPedido}
                    </span>
                  </p>
                )}
                {entrega.numeroNfe && (
                  <p>
                    NF-e:{" "}
                    <span className="font-bold text-slate-700">
                      {entrega.numeroNfe}
                    </span>
                  </p>
                )}
                {entrega.observacoes && (
                  <p className="leading-5">{entrega.observacoes}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {entrega.latitude !== null && entrega.longitude !== null && (
        <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <MiniMapaEntrega
            latitude={entrega.latitude}
            longitude={entrega.longitude}
            mostrarMotorista={emRota}
          />
        </section>
      )}

      {emRota && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-[#0A1F44]">
            Status da entrega
          </h2>

          <div className="mt-4 space-y-0">
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="grid size-6 place-items-center rounded-full bg-[#1768D8] text-white">
                  <CheckCircle2 className="size-3.5" />
                </span>
                <span className="h-8 w-px bg-[#BCD5FA]" />
              </div>
              <p className="pt-0.5 text-sm font-bold text-[#0A1F44]">
                Saiu para entrega
              </p>
            </div>

            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="size-6 rounded-full border-2 border-[#9DBEEB] bg-white" />
                <span className="h-8 w-px bg-slate-200" />
              </div>
              <p className="pt-0.5 text-sm font-semibold text-slate-500">
                Entrega no local
              </p>
            </div>

            <div className="flex gap-3">
              <span className="size-6 rounded-full border-2 border-slate-200 bg-white" />
              <p className="pt-0.5 text-sm font-semibold text-slate-400">
                Finalizar
              </p>
            </div>
          </div>
        </section>
      )}

      {erro && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {erro}
        </div>
      )}

      {!entregue && entrega.endereco && (
        <button
          type="button"
          onClick={abrirRota}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#1768D8] bg-white px-4 py-3.5 text-sm font-black text-[#1768D8] transition hover:bg-[#F5F9FF]"
        >
          <Navigation className="size-4" />
          Abrir rota no Waze
          <ChevronRight className="size-4" />
        </button>
      )}

      {pendente && (
        <button
          type="button"
          disabled={pending}
          onClick={iniciar}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1768D8] px-4 py-4 text-sm font-black text-white shadow-sm transition hover:bg-[#125DC2] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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

      {emRota && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <ComprovanteEntregaForm
            entregaId={entrega.id}
            formaPagamento={entrega.formaPagamento}
          />
        </section>
      )}

      {entregue && (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-[#E8F7EF] px-4 py-4 text-sm font-black text-[#15924A]">
          <CheckCircle2 className="size-5" />
          Entrega concluída
        </div>
      )}

      {entrega.horaSaida && (
        <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400">
          <Clock3 className="size-3.5" />
          Saída registrada às {entrega.horaSaida.slice(0, 5)}
        </p>
      )}
    </div>
  );
}
