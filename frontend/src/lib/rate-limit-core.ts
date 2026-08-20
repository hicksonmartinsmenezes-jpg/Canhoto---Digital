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
