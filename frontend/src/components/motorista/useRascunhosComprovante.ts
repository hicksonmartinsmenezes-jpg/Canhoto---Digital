"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmarEntrega } from "@/app/motorista/actions";
import {
  apagarRascunho,
  atualizarRascunho,
  lerRascunho,
  listarRascunhos,
} from "@/lib/comprovante-pendente";
import {
  enviarRascunho,
  type DependenciasEnvio,
  type ResultadoEnvioRascunho,
} from "@/lib/comprovante-envio";

const INTERVALO_REENVIO_MS = 30_000;

const dependenciasReais: DependenciasEnvio = {
  ler: lerRascunho,
  apagar: apagarRascunho,
  atualizar: atualizarRascunho,
  enviar: (entregaId, formData) => confirmarEntrega(entregaId, formData),
  agora: () => Date.now(),
};

/** Envia o rascunho guardado desta entrega agora (uma tentativa). */
export function enviarRascunhoSalvo(
  entregaId: string
): Promise<ResultadoEnvioRascunho> {
  return enviarRascunho(entregaId, dependenciasReais);
}

export interface RascunhoVisivel {
  entregaId: string;
  rotulo: string | null;
  criadoEm: number;
  tentativas: number;
  rejeitado: boolean;
  mensagem: string | null;
  fotoUrl: string;
  assinaturaUrl: string;
}

/**
 * Lista os comprovantes guardados no aparelho (de uma entrega ou de todas) e
 * cuida do reenvio: ao abrir, quando a internet volta, quando o app volta
 * para a frente e a cada 30 s. Rascunho recusado pelo servidor não é reenviado
 * sozinho — fica esperando o motorista decidir.
 */
export function useRascunhosComprovante(entregaId?: string) {
  const router = useRouter();
  const [rascunhos, setRascunhos] = useState<RascunhoVisivel[]>([]);
  const [enviando, setEnviando] = useState<string[]>([]);
  const [carregado, setCarregado] = useState(false);
  const urlsRef = useRef<string[]>([]);
  const montadoRef = useRef(true);
  const temPendenteAutomaticoRef = useRef(false);

  const liberarUrls = useCallback(() => {
    for (const url of urlsRef.current) URL.revokeObjectURL(url);
    urlsRef.current = [];
  }, []);

  const recarregar = useCallback(async () => {
    const todos = await listarRascunhos();
    const filtrados = entregaId
      ? todos.filter((r) => r.entregaId === entregaId)
      : todos;

    liberarUrls();
    const visiveis = filtrados.map((r): RascunhoVisivel => {
      const fotoUrl = URL.createObjectURL(r.fotoEntrega);
      const assinaturaUrl = URL.createObjectURL(r.assinatura);
      urlsRef.current.push(fotoUrl, assinaturaUrl);
      return {
        entregaId: r.entregaId,
        rotulo: r.rotulo ?? null,
        criadoEm: r.criadoEm,
        tentativas: r.tentativas,
        rejeitado: r.rejeitado,
        mensagem: r.ultimoErro,
        fotoUrl,
        assinaturaUrl,
      };
    });

    temPendenteAutomaticoRef.current = visiveis.some((r) => !r.rejeitado);
    if (montadoRef.current) {
      setRascunhos(visiveis);
      setCarregado(true);
    }
  }, [entregaId, liberarUrls]);

  const processar = useCallback(
    async (somenteEste?: string) => {
      // Automático só tenta quando o aparelho acha que há rede; o toque do
      // motorista ("Enviar agora") sempre tenta.
      if (
        !somenteEste &&
        typeof navigator !== "undefined" &&
        navigator.onLine === false
      ) {
        return;
      }

      const todos = await listarRascunhos();
      const alvos = todos.filter((r) => {
        if (entregaId && r.entregaId !== entregaId) return false;
        if (somenteEste) return r.entregaId === somenteEste;
        return !r.rejeitado;
      });

      let mudouAlgo = false;
      for (const alvo of alvos) {
        setEnviando((atuais) => [...atuais, alvo.entregaId]);
        const resultado = await enviarRascunhoSalvo(alvo.entregaId);
        if (montadoRef.current) {
          setEnviando((atuais) => atuais.filter((id) => id !== alvo.entregaId));
        }
        if (resultado.estado === "enviado" || resultado.estado === "expirado") {
          mudouAlgo = true;
        }
      }

      await recarregar();
      if (mudouAlgo && montadoRef.current) router.refresh();
    },
    [entregaId, recarregar, router]
  );

  useEffect(() => {
    montadoRef.current = true;
    void recarregar().then(() => processar());

    const aoVoltarRede = () => void processar();
    const aoVoltarParaApp = () => {
      if (document.visibilityState === "visible") void processar();
    };
    window.addEventListener("online", aoVoltarRede);
    document.addEventListener("visibilitychange", aoVoltarParaApp);

    const intervalo = window.setInterval(() => {
      if (temPendenteAutomaticoRef.current) void processar();
    }, INTERVALO_REENVIO_MS);

    return () => {
      montadoRef.current = false;
      window.removeEventListener("online", aoVoltarRede);
      document.removeEventListener("visibilitychange", aoVoltarParaApp);
      window.clearInterval(intervalo);
      liberarUrls();
    };
  }, [recarregar, processar, liberarUrls]);

  const enviarAgora = useCallback(
    (id: string) => processar(id),
    [processar]
  );

  const descartar = useCallback(
    async (id: string) => {
      await apagarRascunho(id);
      await recarregar();
    },
    [recarregar]
  );

  return { rascunhos, enviando, carregado, enviarAgora, descartar, recarregar };
}
