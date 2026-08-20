import "server-only";
import { headers } from "next/headers";
import { avaliarJanela, type Registro } from "@/lib/rate-limit-core";
import type { RateLimitResult } from "@/lib/rate-limit-core";

// Rate limit simples (janela deslizante, em memória) para as Server Actions
// de escrita do sistema — hoje qualquer pessoa com o link consegue chamá-las
// diretamente (sem passar pela UI), já que ainda não existe login real (ver
// nota em @/lib/supabase/admin sobre a pendência de autenticação). Isso não
// impede um usuário autenticado malicioso, mas freia abuso básico (clique
// repetido, script simples martelando a action) sem introduzir uma
// dependência paga (ex. Upstash Redis) antes de precisar de verdade.
//
// A lógica de janela deslizante em si vive em @/lib/rate-limit-core (sem
// "server-only"/"next/headers") pra dar pra testar com Vitest — ver
// rate-limit.test.ts. Este arquivo só faz a parte que exige uma requisição
// Next.js real: pegar o IP do cabeçalho e guardar o estado entre chamadas.
//
// Limitação conhecida: em memória do processo Node — funciona bem no deploy
// atual (uma instância só). Se o projeto migrar para múltiplas instâncias
// ou serverless com cold start frequente, o limite passa a valer por
// instância, não globalmente, e o caminho recomendado nesse ponto é trocar
// por um rate limiter externo compartilhado (ex. @upstash/ratelimit) em vez
// de crescer essa implementação.

const RATE_LIMIT_JANELA_MS = 60_000; // 1 minuto
const RATE_LIMIT_PADRAO = 10; // 10 ações por minuto, por IP + ação
export const RATE_LIMIT_ESTRITO = 5; // usado em ações destrutivas (excluir)

const registros = new Map<string, Registro>();

async function obterIdentificador(): Promise<string> {
  const h = await headers();
  // "x-forwarded-for" pode vir com múltiplos IPs separados por vírgula
  // (proxy/CDN na frente) — o primeiro é o do cliente original.
  const forwardedFor = h.get("x-forwarded-for");
  return (
    forwardedFor?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido"
  );
}

// Chamar no início de cada Server Action de escrita. `acao` é um nome curto
// e estável (ex. "criarEntrega") — vira parte da chave de rate limit junto
// com o IP, então ações diferentes têm limites independentes entre si.
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

// Limpeza periódica — evita que a Map cresça pra sempre num processo de
// vida longa. Remove só chaves sem nenhuma tentativa dentro da janela atual.
if (typeof setInterval !== "undefined") {
  const intervalo = setInterval(() => {
    const agora = Date.now();
    for (const [chave, registro] of registros) {
      const ativos = registro.timestamps.filter(
        (t) => agora - t < RATE_LIMIT_JANELA_MS
      );
      if (ativos.length === 0) registros.delete(chave);
      else registro.timestamps = ativos;
    }
  }, 10 * 60_000);
  intervalo.unref?.();
}
