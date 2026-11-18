"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  Loader2,
  Map as MapaIcone,
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
import { ComprovanteGuardadoSemFormulario } from "@/components/motorista/ComprovanteGuardadoSemFormulario";
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
  const horaConclusao = entrega.clienteAssinouEm
    ? new Date(entrega.clienteAssinouEm).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
    : null;

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

  // Só mostra o local no Google Maps (sem iniciar rota nem registrar saída).
  function verNoMapa() {
    const params = new URLSearchParams({ api: "1" });

    if (entrega.latitude !== null && entrega.longitude !== null) {
      params.set("query", `${entrega.latitude},${entrega.longitude}`);
    } else {
      if (!entrega.enderecoRoteavel) return;
      params.set("query", entrega.enderecoRoteavel);
    }

    window.location.assign(
      `https://www.google.com/maps/search/?${params.toString()}`
    );
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
      let resultado: Awaited<ReturnType<typeof iniciarEntrega>>;
      try {
        resultado = await iniciarEntrega(entrega.id);
      } catch {
        // Sinal fraco: sem isso a exceção virava tela de erro.
        setErro(
          "Sem conexão com o servidor. Confira o sinal e toque em iniciar de novo."
        );
        return;
      }

      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível iniciar a entrega.");
        return;
      }

      // A entrega já começou: atualiza a tela agora e manda a posição em
      // segundo plano (antes o botão ficava "Iniciando…" até 15 s esperando
      // o GPS).
      router.refresh();
      void registrarLocalizacaoAtual();
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
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            {!emRota && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  entregue
                    ? "bg-[#E8F7EF] text-[#15924A]"
                    : "bg-[#FFF0DE] text-[#D96B0B]"
                }`}
              >
                {entregue ? "Concluída" : "Pendente"}
              </span>
            )}
            <span className="text-xs font-black text-slate-500">
              {entrega.numero}
            </span>
            {entrega.rota && (
              <span className="text-xs font-black text-[#1768D8]">
                Parada {entrega.rota.posicao} de {entrega.rota.total}
              </span>
            )}
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

      {erro && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {erro}
        </div>
      )}

      {/* Waze só depois de iniciar: abrir a rota passa a significar "saí",
          e a loja vê o motorista em rota com a hora certa. */}
      {emRota && (entrega.endereco || entrega.latitude !== null) && (
        <button
          type="button"
          onClick={abrirRota}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#1768D8] bg-white px-4 py-3.5 text-sm font-black text-[#1768D8] transition hover:bg-[#F5F9FF] active:scale-[0.99]"
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

      {(pendente || emRota) &&
        (entrega.enderecoRoteavel || entrega.latitude !== null) && (
          <button
            type="button"
            onClick={verNoMapa}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#1768D8] bg-white px-4 py-3.5 text-sm font-black text-[#1768D8] transition hover:bg-[#F5F9FF] active:scale-[0.99]"
          >
            <MapaIcone className="size-4" />
            Ver no mapa
            <ChevronRight className="size-4" />
          </button>
        )}

      {emRota && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <ComprovanteEntregaForm
            entregaId={entrega.id}
            formaPagamento={entrega.formaPagamento}
            rotulo={`${entrega.numero} · ${entrega.clienteNome}`}
          />
        </section>
      )}

      {!emRota && <ComprovanteGuardadoSemFormulario entregaId={entrega.id} />}

      {entregue && (
        <section className="rounded-3xl border border-emerald-200 bg-[#E8F7EF] px-5 py-5">
          <p className="flex items-center gap-2 text-base font-black text-[#15924A]">
            <CheckCircle2 className="size-5" />
            Entrega concluída
            {horaConclusao && (
              <span className="text-sm font-bold text-[#15924A]/80">
                às {horaConclusao}
              </span>
            )}
          </p>
          <ul className="mt-3 space-y-1.5 text-sm font-semibold text-slate-700">
            <ItemComprovante ok={entrega.comprovantes.foto} texto="Foto do canhoto recebida pela loja" faltando="Foto do canhoto não encontrada" />
            {entrega.comprovantes.produto > 0 && (
              <ItemComprovante ok texto={entrega.comprovantes.produto > 1 ? `${entrega.comprovantes.produto} fotos do produto recebidas pela loja` : "Foto do produto recebida pela loja"} faltando="" />
            )}
            {entrega.comprovantes.pix && (
              <ItemComprovante ok texto="Comprovante Pix recebido" faltando="" />
            )}
          </ul>
          <Link
            href={
              entrega.rota?.proximaId
                ? `/motorista/entregas/${entrega.rota.proximaId}`
                : "/motorista"
            }
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#15924A] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#117D3F]"
          >
            {entrega.rota?.proximaId
              ? "Ir para a próxima parada"
              : "Ver próximas entregas"}
            <ChevronRight className="size-4" />
          </Link>
        </section>
      )}

      {entrega.horaSaida && !emRota && (
        <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400">
          <Clock3 className="size-3.5" />
          Saída registrada às {entrega.horaSaida.slice(0, 5)}
        </p>
      )}
    </div>
  );
}

function ItemComprovante({
  ok,
  texto,
  faltando,
}: {
  ok: boolean;
  texto: string;
  faltando: string;
}) {
  return (
    <li className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="size-4 shrink-0 text-[#15924A]" />
      ) : (
        <span className="size-4 shrink-0 rounded-full border-2 border-slate-300" />
      )}
      <span className={ok ? "" : "text-slate-500"}>
        {ok ? texto : faltando}
      </span>
    </li>
  );
}
