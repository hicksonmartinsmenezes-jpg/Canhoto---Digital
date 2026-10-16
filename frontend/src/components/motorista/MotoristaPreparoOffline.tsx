"use client";

import { useEffect } from "react";
import { marcarOfflinePronto } from "@/lib/app-nativo";
import { pedirPrecarga } from "@/lib/offline-cache";

const INTERVALO_MINIMO_MS = 10 * 60 * 1000;
const MAXIMO_ENTREGAS = 15;

let ultimaPrecargaEm = 0;

/**
 * Sem efeito visual: com internet, manda o service worker guardar a lista e as
 * telas das entregas do dia para o app abrir mesmo sem sinal, e avisa o app
 * Android quando isso estiver pronto.
 */
export function MotoristaPreparoOffline({
  entregaIds,
}: {
  entregaIds: string[];
}) {
  const chave = entregaIds.join(",");

  useEffect(() => {
    if (navigator.onLine === false) return;
    if (Date.now() - ultimaPrecargaEm < INTERVALO_MINIMO_MS) return;
    ultimaPrecargaEm = Date.now();

    const ids = chave ? chave.split(",").slice(0, MAXIMO_ENTREGAS) : [];
    void pedirPrecarga([
      "/motorista",
      "/motorista/offline",
      ...ids.map((id) => `/motorista/entregas/${id}`),
    ]).then((pronto) => {
      // Só avisa o app depois de confirmar que a lista ficou guardada.
      if (pronto) void marcarOfflinePronto();
    });
  }, [chave]);

  return null;
}
