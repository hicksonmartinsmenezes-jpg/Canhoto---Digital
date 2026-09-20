"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const INTERVALO_ATUALIZACAO_MS = 10_000;

export function MotoristaAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    function atualizarSeVisivel() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
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
