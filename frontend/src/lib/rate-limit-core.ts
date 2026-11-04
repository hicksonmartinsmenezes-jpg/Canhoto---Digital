// Núcleo puro do limite por IP (janela deslizante), sem dependências de
// Next.js, para permitir testes unitários isolados.

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

// cf-connecting-ip é definido pelo Cloudflare na borda. x-forwarded-for
// pode conter entradas enviadas pelo cliente; por isso usamos a última.
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
