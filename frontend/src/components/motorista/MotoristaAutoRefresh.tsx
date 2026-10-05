"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Antes: a cada 10 s (e a cada foco/visibilidade) a página inteira era
// renderizada de novo no servidor, e os toques do motorista ficavam na fila
// atrás dessa atualização. Agora: 30 s e no máximo uma atualização a cada 8 s.
const INTERVALO_ATUALIZACAO_MS = 30_000;
const INTERVALO_MINIMO_MS = 8_000;

export function MotoristaAutoRefresh() {
  const router = useRouter();
  const ultimaAtualizacaoRef = useRef(0);

  useEffect(() => {
    ultimaAtualizacaoRef.current = Date.now();

    function atualizarSeVisivel() {
      if (document.visibilityState !== "visible") return;
      const agora = Date.now();
      if (agora - ultimaAtualizacaoRef.current < INTERVALO_MINIMO_MS) return;
      ultimaAtualizacaoRef.current = agora;
      router.refresh();
    }

    const intervalo = window.setInterval(
      atualizarSeVisivel,
      INTERVALO_ATUALIZACAO_MS
    );

    document.addEventListener("visibilitychange", atualizarSeVisivel);
    window.addEventListener("focus", atualizarSeVisivel);
    window.addEventListener("online", atualizarSeVisivel);

    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", atualizarSeVisivel);
      window.removeEventListener("focus", atualizarSeVisivel);
      window.removeEventListener("online", atualizarSeVisivel);
    };
  }, [router]);

  return null;
}
