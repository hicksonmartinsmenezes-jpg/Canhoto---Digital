"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Route,
} from "lucide-react";
import { iniciarRota } from "@/app/motorista/actions";
import type { EntregaMotoristaHoje } from "@/lib/data/entregas";
import {
  ordenarPorProximidade,
  type ParadaRota,
  type Ponto,
} from "@/lib/rota";
import { MAX_PARADAS_ROTA, MIN_PARADAS_ROTA } from "@/lib/rota-limites";

type ParadaDaTela = ParadaRota & { entrega: EntregaMotoristaHoje };

export function paradaDaEntrega(entrega: EntregaMotoristaHoje): ParadaDaTela {
  return {
    id: entrega.id,
    latitude: entrega.latitude,
    longitude: entrega.longitude,
    enderecoTexto: [entrega.endereco, entrega.cep].filter(Boolean).join(", "),
    entrega,
  };
}

/** Posição atual do aparelho (null se negada, indisponível ou demorada). */
function posicaoAtual(): Promise<Ponto | null> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (posicao) =>
        resolve({
          latitude: posicao.coords.latitude,
          longitude: posicao.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 4_000 }
    );
  });
}

/**
 * Monta uma rota com várias entregas aguardando saída: primeiro o motorista
 * marca as entregas, depois confere a ordem das paradas (sugerida pela mais
 * próxima) e inicia todas de uma vez.
 */
export function MotoristaMontarRota({
  entregas,
  onFechar,
}: {
  entregas: EntregaMotoristaHoje[];
  onFechar: () => void;
}) {
  const router = useRouter();
  const [escolhidas, setEscolhidas] = useState<string[]>([]);
  const [etapa, setEtapa] = useState<"escolher" | "ordenar">("escolher");
  const [ordem, setOrdem] = useState<ParadaDaTela[]>([]);
  const [calculando, setCalculando] = useState(false);
  const [usouLocalizacao, setUsouLocalizacao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Entregas que sumiram da lista (ex.: outro aparelho iniciou) saem da seleção.
  const disponiveis = new Set(entregas.map((entrega) => entrega.id));
  const marcadas = escolhidas.filter((id) => disponiveis.has(id));

  function alternar(id: string) {
    setErro(null);
    setEscolhidas((atuais) => {
      if (atuais.includes(id)) return atuais.filter((item) => item !== id);
      if (atuais.filter((item) => disponiveis.has(item)).length >= MAX_PARADAS_ROTA) {
        return atuais;
      }
      return [...atuais, id];
    });
  }

  async function continuar() {
    const selecionadas = marcadas
      .map((id) => entregas.find((entrega) => entrega.id === id))
      .filter((entrega): entrega is EntregaMotoristaHoje => Boolean(entrega))
      .map(paradaDaEntrega);

    setErro(null);
    setCalculando(true);
    setEtapa("ordenar");
    // Mostra já a ordem de seleção; ajusta assim que a posição chegar.
    setOrdem(selecionadas);
    const origem = await posicaoAtual();
    setOrdem(ordenarPorProximidade(selecionadas, origem));
    setUsouLocalizacao(origem !== null);
    setCalculando(false);
  }

  function mover(indice: number, delta: -1 | 1) {
    setOrdem((atual) => {
      const destino = indice + delta;
      if (destino < 0 || destino >= atual.length) return atual;
      const copia = [...atual];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  }

  function iniciar() {
    setErro(null);
    startTransition(async () => {
      let resultado: Awaited<ReturnType<typeof iniciarRota>>;
      try {
        resultado = await iniciarRota(ordem.map((parada) => parada.id));
      } catch {
        setErro(
          "Sem conexão com o servidor. Confira o sinal e toque em iniciar de novo."
        );
        return;
      }

      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível iniciar a rota.");
        return;
      }

      onFechar();
      router.refresh();
    });
  }

  const podeContinuar = marcadas.length >= MIN_PARADAS_ROTA;

  return (
    <div className="pb-28">
      <div className="mx-4 mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[15px] font-black text-[#0A1F44]">
          <Route className="size-4 text-[#1768D8]" />
          {etapa === "escolher" ? "Escolha as entregas da rota" : "Ordem das paradas"}
        </h3>
        <button
          type="button"
          onClick={onFechar}
          disabled={pending}
          className="text-sm font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>

      {etapa === "escolher" ? (
        <>
          <p className="mx-4 mb-3 text-xs font-medium text-slate-500">
            Marque de {MIN_PARADAS_ROTA} a {MAX_PARADAS_ROTA} entregas para sair
            juntas. Depois você confere a ordem.
          </p>

          <ul className="border-y border-slate-200 bg-white">
            {entregas.map((entrega) => {
              const marcada = marcadas.includes(entrega.id);
              const cheia =
                !marcada && marcadas.length >= MAX_PARADAS_ROTA;
              return (
                <li key={entrega.id} className="border-b border-slate-100 last:border-b-0">
                  <label
                    className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition active:bg-slate-50 ${
                      cheia ? "opacity-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={marcada}
                      disabled={cheia}
                      onChange={() => alternar(entrega.id)}
                    />
                    <span
                      aria-hidden
                      className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 transition ${
                        marcada
                          ? "border-[#1768D8] bg-[#1768D8] text-white"
                          : "border-slate-300 bg-white text-transparent"
                      }`}
                    >
                      <Check className="size-4" strokeWidth={3} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold text-slate-500">
                          {entrega.numero}
                        </span>
                        <span className="truncate text-[15px] font-black text-[#0A1F44]">
                          {entrega.clienteNome}
                        </span>
                      </span>
                      {entrega.endereco && (
                        <span className="mt-1 flex items-start gap-1.5 text-[12px] font-medium leading-5 text-slate-500">
                          <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#315A8E]" />
                          <span className="line-clamp-1">{entrega.endereco}</span>
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div
            className="fixed inset-x-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur"
            style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[#0A1F44]">
                {marcadas.length}{" "}
                {marcadas.length === 1 ? "selecionada" : "selecionadas"}
              </p>
              <button
                type="button"
                disabled={!podeContinuar}
                onClick={() => void continuar()}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1768D8] px-5 py-3 text-sm font-black text-white transition hover:bg-[#125DC2] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="mx-4 mb-3 text-xs font-medium text-slate-500">
            {calculando
              ? "Calculando a melhor ordem…"
              : usouLocalizacao
                ? "Ordem sugerida: da mais próxima de você para a mais longe. Use as setas para trocar."
                : "Use as setas para trocar a ordem das paradas."}
          </p>

          <ol className="border-y border-slate-200 bg-white">
            {ordem.map((parada, indice) => (
              <li
                key={parada.id}
                className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#EAF2FF] text-sm font-black text-[#1768D8]">
                  {indice + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold text-slate-500">
                      {parada.entrega.numero}
                    </span>
                    <span className="truncate text-[15px] font-black text-[#0A1F44]">
                      {parada.entrega.clienteNome}
                    </span>
                  </span>
                  {parada.entrega.endereco && (
                    <span className="mt-0.5 block truncate text-[12px] font-medium text-slate-500">
                      {parada.entrega.endereco}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    aria-label={`Subir ${parada.entrega.clienteNome}`}
                    disabled={indice === 0 || pending}
                    onClick={() => mover(indice, -1)}
                    className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Descer ${parada.entrega.clienteNome}`}
                    disabled={indice === ordem.length - 1 || pending}
                    onClick={() => mover(indice, 1)}
                    className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </span>
              </li>
            ))}
          </ol>

          {erro && (
            <div className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {erro}
            </div>
          )}

          <div
            className="fixed inset-x-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur"
            style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setErro(null);
                  setEtapa("escolher");
                }}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={pending || calculando}
                onClick={iniciar}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1768D8] px-4 py-3 text-sm font-black text-white transition hover:bg-[#125DC2] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>Iniciar rota ({ordem.length} paradas)</>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
