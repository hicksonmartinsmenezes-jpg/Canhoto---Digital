"use client";

import { useEffect, useRef } from "react";

/**
 * Mantém a tela do celular ligada enquanto o motorista tem uma entrega em
 * rota (mesmo gate que ativa o MotoristaLocationTracker). Isso evita que a
 * tela apague sozinha por inatividade — um dos motivos mais comuns do
 * rastreamento parar de atualizar, já que o navegador suspende o
 * watchPosition quando a página sai de primeiro plano.
 *
 * Não resolve o caso do motorista trocar pra outro app (ex.: Waze) — isso é
 * uma limitação estrutural de app web, sem Wake Lock que dê conta.
 */
export function MotoristaWakeLock({ ativo }: { ativo: boolean }) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!ativo || !("wakeLock" in navigator)) return;

    let cancelado = false;

    async function solicitar() {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelado) {
          void lock.release();
          return;
        }
        wakeLockRef.current = lock;
      } catch {
        // Sem Wake Lock disponível agora (ex.: bateria baixa no Android) —
        // o rastreamento continua funcionando normalmente, só sem essa
        // proteção extra.
      }
    }

    void solicitar();

    function reativarAoVoltar() {
      if (document.visibilityState === "visible" && !wakeLockRef.current) {
        void solicitar();
      }
    }

    document.addEventListener("visibilitychange", reativarAoVoltar);

    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", reativarAoVoltar);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [ativo]);

  return null;
}
