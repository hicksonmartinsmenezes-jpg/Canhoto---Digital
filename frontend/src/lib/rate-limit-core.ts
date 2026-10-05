// Núcleo puro da lógica de rate limit (janela deslizante) — sem depender de
// "server-only" nem de "next/headers", justamente para poder ser testado
// isoladamente com Vitest (rodar fora de uma requisição Next.js real). O
// wrapper que expõe isso pras Server Actions fica em @/lib/rate-limit.

export interface Registro {
  timestamps: number[];
}

export interface RateLimitResult {
  permitido: boolean;
  restante: number;
}

export function avaliarJanela(
  registros: Map<string, Registro>,
  chave: string,
  agora: number,
  limite: number,
  janelaMs: number
): RateLimitResult {
  const registro = registros.get(chave) ?? { timestamps: [] };
  registro.timestamps = registro.timestamps.filter((t) => agora - t < janelaMs);

  if (registro.timestamps.length >= limite) {
    registros.set(chave, registro);
    return { permitido: false, restante: 0 };
  }

  registro.timestamps.push(agora);
  registros.set(chave, registro);
  return { permitido: true, restante: limite - registro.timestamps.length };
}

// Conta ocorrências dentro da janela SEM registrar uma nova — usado no
// bloqueio por conta (só falhas de login contam, tentativas bem-sucedidas
// não).
export function contarNaJanela(
  registros: Map<string, Registro>,
  chave: string,
  agora: number,
  janelaMs: number
): number {
  const registro = registros.get(chave);
  if (!registro) return 0;
  registro.timestamps = registro.timestamps.filter((t) => agora - t < janelaMs);
  return registro.timestamps.length;
}

export function registrarOcorrencia(
  registros: Map<string, Registro>,
  chave: string,
  agora: number,
  janelaMs: number
): void {
  const registro = registros.get(chave) ?? { timestamps: [] };
  registro.timestamps = registro.timestamps.filter((t) => agora - t < janelaMs);
  registro.timestamps.push(agora);
  registros.set(chave, registro);
}

// Escolhe o IP do cliente a partir dos cabeçalhos. `cf-connecting-ip` é
// sobrescrito pelo Cloudflare (o cliente não consegue forjar quando entra
// pelo túnel); `x-forwarded-for` pode vir preenchido pelo próprio cliente,
// então só entra como fallback e usando a ÚLTIMA entrada (a que o proxy
// mais próximo acrescentou), nunca a primeira.
export function escolherIpDoCliente(h: {
  get(nome: string): string | null;
}): string {
  const cf = h.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  const encaminhado = h.get("x-forwarded-for");
  if (encaminhado) {
    const partes = encaminhado
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (partes.length > 0) return partes[partes.length - 1];
  }

  return h.get("x-real-ip")?.trim() || "desconhecido";
}
