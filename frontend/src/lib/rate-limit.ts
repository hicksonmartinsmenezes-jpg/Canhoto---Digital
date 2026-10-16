import "server-only";
import { headers } from "next/headers";
import {
  avaliarJanela,
  contarNaJanela,
  escolherIpDoCliente,
  registrarOcorrencia,
  type Registro,
} from "@/lib/rate-limit-core";
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
  return escolherIpDoCliente(await headers());
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

// Bloqueio por CONTA (além do limite por IP): contar só falhas de login
// numa janela maior. Impede que quem troca de IP (ou vários IPs atrás do
// mesmo NAT/túnel) force o PIN de 4 dígitos de um motorista específico.
const LOGIN_FALHAS_JANELA_MS = 15 * 60_000;
const LOGIN_FALHAS_MAXIMAS = 8;
const falhasLogin = new Map<string, Registro>();

export function contaBloqueadaPorFalhas(
  acao: string,
  identificador: string
): boolean {
  return (
    contarNaJanela(
      falhasLogin,
      `${acao}:${identificador}`,
      Date.now(),
      LOGIN_FALHAS_JANELA_MS
    ) >= LOGIN_FALHAS_MAXIMAS
  );
}

export function registrarFalhaLogin(acao: string, identificador: string): void {
  registrarOcorrencia(
    falhasLogin,
    `${acao}:${identificador}`,
    Date.now(),
    LOGIN_FALHAS_JANELA_MS
  );
}

export function limparFalhasLogin(acao: string, identificador: string): void {
  falhasLogin.delete(`${acao}:${identificador}`);
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
    for (const [chave, registro] of falhasLogin) {
      if (registro.timestamps.every((t) => agora - t >= LOGIN_FALHAS_JANELA_MS))
        falhasLogin.delete(chave);
    }
  }, 10 * 60_000);
  intervalo.unref?.();
}
