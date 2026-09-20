"use client";

import { useEffect, useRef } from "react";
import { atualizarLocalizacaoMotorista } from "@/app/motorista/actions";

const INTERVALO_MINIMO_ENVIO_MS = 15_000;

export function MotoristaLocationTracker({ ativo }: { ativo: boolean }) {
  const ultimoEnvioRef = useRef(0);

  useEffect(() => {
    if (!ativo || !("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (posicao) => {
        const agora = Date.now();
        if (agora - ultimoEnvioRef.current < INTERVALO_MINIMO_ENVIO_MS) return;
        ultimoEnvioRef.current = agora;

        void atualizarLocalizacaoMotorista({
          latitude: posicao.coords.latitude,
          longitude: posicao.coords.longitude,
          precisaoMetros: posicao.coords.accuracy,
        });
      },
      () => {
        // Sem localização, o restante do fluxo continua funcionando.
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [ativo]);

  return null;
}
