"use client";

import { useEffect } from "react";

// Registra o service worker mínimo (public/motorista-sw.js) — necessário
// pra o Chrome/Android oferecer "Instalar app" na área do motorista em vez
// de só "Criar atalho". Sem efeito visual (ver MotoristaAutoRefresh e
// MotoristaLocationTracker pro mesmo padrão de componente client só com
// efeito colateral).
export function MotoristaServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/motorista-sw.js", { scope: "/motorista" })
      .catch(() => {
        // Falhou o registro — o app continua funcionando normalmente, só
        // sem a opção de instalar como PWA.
      });
  }, []);

  return null;
}
