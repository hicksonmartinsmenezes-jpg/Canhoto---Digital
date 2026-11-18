// Data e hora no fuso da loja (Brasília), independentes do relógio do
// processo. O container define TZ, mas depender dela já custou horas de saída
// 3 h adiantadas: aqui o fuso é explícito.

export const FUSO_LOJA = "America/Sao_Paulo";

/** "2026-11-18" — o dia como está na loja agora. */
export function diaNaLoja(agora: Date = new Date()): string {
  return agora.toLocaleDateString("en-CA", { timeZone: FUSO_LOJA });
}

/** "09:57:00" — a hora como está na loja agora. */
export function horaNaLoja(agora: Date = new Date()): string {
  return agora.toLocaleTimeString("en-GB", {
    timeZone: FUSO_LOJA,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
