"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Map as MapaIcone,
  Navigation,
  Route,
} from "lucide-react";
import { paradaDaEntrega } from "@/components/motorista/MotoristaMontarRota";
import type { EntregaMotoristaHoje } from "@/lib/data/entregas";
import { linkGoogleMapsRota, linkWazeParada } from "@/lib/rota";

/**
 * Rota com várias paradas em andamento: lista as paradas na ordem, mostra
 * quais já foram concluídas e abre a rota nos mapas (Google Maps leva todas
 * as paradas restantes; o Waze só aceita uma por vez, então vai para a
 * próxima).
 */
export function MotoristaRotaEmAndamento({
  paradas,
}: {
  /** Todas as paradas da rota (concluídas e em aberto), em qualquer ordem. */
  paradas: EntregaMotoristaHoje[];
}) {
  const ordenadas = [...paradas].sort(
    (a, b) => (a.rotaOrdem ?? 0) - (b.rotaOrdem ?? 0)
  );
  const emAberto = ordenadas.filter((parada) => parada.status === "pendente");
  const concluidas = ordenadas.length - emAberto.length;
  const proxima = emAberto[0] ?? null;

  const linkMaps = linkGoogleMapsRota(emAberto.map(paradaDaEntrega));
  const linkWaze = proxima ? linkWazeParada(paradaDaEntrega(proxima)) : null;

  function abrir(link: string | null) {
    if (link) window.location.assign(link);
  }

  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
        <h3 className="flex items-center gap-2 text-[13px] font-black text-[#0A1F44]">
          <Route className="size-4 text-[#1768D8]" />
          Rota com {ordenadas.length} paradas
        </h3>
        <span className="text-xs font-bold text-slate-500">
          {concluidas} de {ordenadas.length} concluídas
        </span>
      </div>

      <ol>
        {ordenadas.map((parada, indice) => {
          const concluida = parada.status === "entregue";
          const ehProxima = proxima?.id === parada.id;
          return (
            <li key={parada.id} className="border-t border-slate-100">
              <Link
                href={`/motorista/entregas/${parada.id}`}
                className="flex items-center gap-3 px-4 py-3 transition active:bg-slate-50"
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-black ${
                    concluida
                      ? "bg-[#E7F8EF] text-[#169653]"
                      : ehProxima
                        ? "bg-[#1768D8] text-white"
                        : "bg-[#EAF2FF] text-[#1768D8]"
                  }`}
                >
                  {concluida ? <CheckCircle2 className="size-4" /> : indice + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold text-slate-500">
                      {parada.numero}
                    </span>
                    <span
                      className={`truncate text-[15px] font-black ${
                        concluida ? "text-slate-400 line-through" : "text-[#0A1F44]"
                      }`}
                    >
                      {parada.clienteNome}
                    </span>
                  </span>
                  {parada.endereco && (
                    <span className="mt-0.5 block truncate text-[12px] font-medium text-slate-500">
                      {parada.endereco}
                    </span>
                  )}
                </span>
                {ehProxima && (
                  <span className="shrink-0 text-[11px] font-black text-slate-500">
                    Próxima
                  </span>
                )}
                <ChevronRight className="size-4 shrink-0 text-slate-400" />
              </Link>
            </li>
          );
        })}
      </ol>

      {proxima && (linkMaps || linkWaze) && (
        <div className="grid grid-cols-1 gap-2 border-t border-slate-100 px-4 py-3 min-[380px]:grid-cols-2">
          {linkMaps && (
            <button
              type="button"
              onClick={() => abrir(linkMaps)}
              className="inline-flex items-center justify-center gap-1.5 border border-slate-500 bg-white px-3 py-2 text-[13px] font-black text-slate-500 transition hover:bg-slate-50 active:scale-[0.99]"
            >
              <MapaIcone className="size-4" />
              Rota no Maps
            </button>
          )}
          {linkWaze && (
            <button
              type="button"
              onClick={() => abrir(linkWaze)}
              className="inline-flex items-center justify-center gap-1.5 border border-slate-500 bg-white px-3 py-2 text-[13px] font-black text-slate-500 transition hover:bg-slate-50 active:scale-[0.99]"
            >
              <Navigation className="size-4" />
              Próxima no Waze
            </button>
          )}
        </div>
      )}
    </section>
  );
}
