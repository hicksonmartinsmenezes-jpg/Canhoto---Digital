"use client";

import { useEffect, useRef } from "react";
import { atualizarLocalizacaoMotorista } from "@/app/motorista/actions";

const INTERVALO_MINIMO_ENVIO_MS = 15_000;
// No app nativo, se o motorista parar (semáforo, entrega), o GPS não gera
// posições novas. Reenviamos a última a cada ~45 s pra o mapa do admin não
// marcar o motorista como "sem atualização".
const INTERVALO_BATIMENTO_MS = 45_000;

interface PosicaoMotorista {
  latitude: number;
  longitude: number;
  precisaoMetros: number | null;
}

// Tipos mínimos das pontes do Capacitor (o app nativo injeta window.Capacitor
// na página; no navegador/PWA ele não existe e usamos o geolocation normal).
interface LocalizacaoNativa {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface BackgroundGeolocationNativo {
  addWatcher(
    opcoes: {
      backgroundTitle?: string;
      backgroundMessage?: string;
      requestPermissions?: boolean;
      stale?: boolean;
      distanceFilter?: number;
    },
    callback: (
      localizacao?: LocalizacaoNativa,
      erro?: { code?: string; message?: string }
    ) => void
  ): Promise<string>;
  removeWatcher(opcoes: { id: string }): Promise<void>;
}

interface CapacitorHttpNativo {
  post(opcoes: {
    url: string;
    headers?: Record<string, string>;
    data?: unknown;
    connectTimeout?: number;
    readTimeout?: number;
  }): Promise<{ status: number; data: unknown }>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: {
    BackgroundGeolocation?: BackgroundGeolocationNativo;
    CapacitorHttp?: CapacitorHttpNativo;
  };
}

function obterCapacitor(): CapacitorGlobal | undefined {
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

async function enviarPosicao(posicao: PosicaoMotorista): Promise<void> {
  // No app nativo, tenta primeiro o plugin HTTP nativo (não é limitado pelo
  // Android quando o app está em segundo plano).
  const http = obterCapacitor()?.Plugins?.CapacitorHttp;
  if (http) {
    try {
      const resposta = await http.post({
        url: `${window.location.origin}/motorista/api/localizacao`,
        headers: { "Content-Type": "application/json" },
        data: posicao,
        connectTimeout: 15_000,
        readTimeout: 15_000,
      });
      const dados = resposta.data as { ok?: unknown } | null;
      if (
        resposta.status === 200 &&
        dados !== null &&
        typeof dados === "object" &&
        typeof dados.ok === "boolean"
      ) {
        return;
      }
    } catch {
      // Cai pro envio normal abaixo.
    }
  }

  await atualizarLocalizacaoMotorista(posicao);
}

export function MotoristaLocationTracker({ ativo }: { ativo: boolean }) {
  const ultimoEnvioRef = useRef(0);
  const ultimaPosicaoRef = useRef<PosicaoMotorista | null>(null);

  useEffect(() => {
    if (!ativo) return;

    function registrarPosicao(posicao: PosicaoMotorista) {
      ultimaPosicaoRef.current = posicao;
      const agora = Date.now();
      if (agora - ultimoEnvioRef.current < INTERVALO_MINIMO_ENVIO_MS) return;
      ultimoEnvioRef.current = agora;
      void enviarPosicao(posicao);
    }

    const capacitor = obterCapacitor();
    const nativo = capacitor?.isNativePlatform?.()
      ? capacitor.Plugins?.BackgroundGeolocation
      : undefined;

    // ---- App nativo: rastreamento contínuo, mesmo com a tela bloqueada ou
    // outro app (ex.: Waze) aberto. O plugin mantém um serviço em primeiro
    // plano com uma notificação fixa avisando que a localização está em uso.
    if (nativo) {
      let cancelado = false;
      let watcherId: string | null = null;

      // Promise.resolve: dependendo de como a ponte do app monta o plugin,
      // addWatcher devolve uma Promise ou direto o id do rastreamento.
      Promise.resolve(
        nativo.addWatcher(
          {
            backgroundTitle: "Rildon Express — entrega em andamento",
            backgroundMessage:
              "Sua localização está sendo compartilhada com a loja durante a entrega.",
            requestPermissions: true,
            stale: false,
            distanceFilter: 10,
          },
          (localizacao, erro) => {
            if (erro || !localizacao) return;
            registrarPosicao({
              latitude: localizacao.latitude,
              longitude: localizacao.longitude,
              precisaoMetros: localizacao.accuracy ?? null,
            });
          }
        )
      )
        .then((id) => {
          if (cancelado) {
            void nativo.removeWatcher({ id });
          } else {
            watcherId = id;
          }
        })
        .catch(() => {
          // Sem localização, o restante do fluxo continua funcionando.
        });

      const batimento = window.setInterval(() => {
        const ultima = ultimaPosicaoRef.current;
        if (!ultima) return;
        if (Date.now() - ultimoEnvioRef.current < INTERVALO_BATIMENTO_MS - 5_000) {
          return;
        }
        ultimoEnvioRef.current = Date.now();
        void enviarPosicao(ultima);
      }, INTERVALO_BATIMENTO_MS);

      return () => {
        cancelado = true;
        window.clearInterval(batimento);
        if (watcherId) void nativo.removeWatcher({ id: watcherId });
      };
    }

    // ---- Navegador / PWA: só funciona com a página aberta na tela.
    if (!("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (posicao) => {
        registrarPosicao({
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
