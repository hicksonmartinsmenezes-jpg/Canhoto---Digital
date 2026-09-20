"use client";

import { useEffect, useState } from "react";
import type { MotoristaEmRota } from "@/lib/data/entregas";

const INTERVALO_ATUALIZACAO_MS = 15_000;

export function useMotoristasEmRota(
  iniciais: MotoristaEmRota[]
): MotoristaEmRota[] {
  const [motoristas, setMotoristas] = useState(iniciais);

  useEffect(() => {
    let cancelado = false;

    async function atualizar() {
      if (document.visibilityState !== "visible") return;

      try {
        const resposta = await fetch("/api/dashboard/motoristas-em-rota", {
          cache: "no-store",
        });

        if (!resposta.ok) return;

        const dados = (await resposta.json()) as {
          motoristas?: MotoristaEmRota[];
        };

        if (!cancelado && Array.isArray(dados.motoristas)) {
          setMotoristas(dados.motoristas);
        }
      } catch {
        // Mantém o último estado conhecido se a atualização falhar.
      }
    }

    const intervalo = window.setInterval(atualizar, INTERVALO_ATUALIZACAO_MS);

    function atualizarAoVoltar() {
      void atualizar();
    }

    document.addEventListener("visibilitychange", atualizarAoVoltar);
    window.addEventListener("focus", atualizarAoVoltar);

    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", atualizarAoVoltar);
      window.removeEventListener("focus", atualizarAoVoltar);
    };
  }, []);

  return motoristas;
}
