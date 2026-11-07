import "server-only";
import { headers } from "next/headers";
import {
  avaliarJanela,
  escolherIpDoCliente,
  type Registro,
} from "@/lib/rate-limit-core";
import type { RateLimitResult } from "@/lib/rate-limit-core";

// Limite por IP em memória para Server Actions. A proteção por conta dos
// fluxos de login é persistida no PostgreSQL por @/lib/login-rate-limit.
// Este limite por IP é uma camada adicional e local ao processo: para
// múltiplas instâncias, deve ser migrado para um limitador compartilhado.
const RATE_LIMIT_JANELA_MS = 60_000;
const RATE_LIMIT_PADRAO = 10;
export const RATE_LIMIT_ESTRITO = 5;

const registros = new Map<string, Registro>();

async function obterIdentificador(): Promise<string> {
  return escolherIpDoCliente(await headers());
}

export async function checarRateLimit(
  acao: string,
  limite: number = RATE_LIMIT_PADRAO
): Promise<RateLimitResult> {
  const ip = await obterIdentificador();
  return avaliarJanela(
    registros,
    `${acao}:${ip}`,
    Date.now(),
    limite,
    RATE_LIMIT_JANELA_MS
  );
}

// Limpa somente o estado volátil de IP sem atividade na última janela.
if (typeof setInterval !== "undefined") {
  const intervalo = setInterval(() => {
    const agora = Date.now();
    for (const [chave, registro] of registros) {
      const ativos = registro.timestamps.filter(
        (timestamp) => agora - timestamp < RATE_LIMIT_JANELA_MS
      );
      if (ativos.length === 0) registros.delete(chave);
      else registro.timestamps = ativos;
    }
  }, 10 * 60_000);
  intervalo.unref?.();
}
