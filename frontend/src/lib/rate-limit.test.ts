import { describe, expect, it } from "vitest";
import { avaliarJanela } from "./rate-limit-core";

// Testa só o núcleo puro (avaliarJanela, em rate-limit-core.ts) —
// checarRateLimit (em rate-limit.ts) depende de "server-only" e
// "next/headers", que só existem dentro de uma requisição Next.js real; não
// vale a pena simular isso aqui (ver comentário em rate-limit.ts).
describe("avaliarJanela", () => {
  it("permite tentativas até o limite dentro da janela", () => {
    const registros = new Map();
    for (let i = 0; i < 3; i++) {
      const resultado = avaliarJanela(registros, "acao:1.1.1.1", 1000 + i, 3, 60_000);
      expect(resultado.permitido).toBe(true);
    }
  });

  it("bloqueia a partir da tentativa que excede o limite", () => {
    const registros = new Map();
    avaliarJanela(registros, "acao:1.1.1.1", 1000, 3, 60_000);
    avaliarJanela(registros, "acao:1.1.1.1", 1001, 3, 60_000);
    avaliarJanela(registros, "acao:1.1.1.1", 1002, 3, 60_000);
    const quarta = avaliarJanela(registros, "acao:1.1.1.1", 1003, 3, 60_000);

    expect(quarta.permitido).toBe(false);
    expect(quarta.restante).toBe(0);
  });

  it("libera de novo depois que a janela desliza pra frente", () => {
    const registros = new Map();
    avaliarJanela(registros, "acao:1.1.1.1", 0, 1, 60_000);

    const aindaDentroDaJanela = avaliarJanela(registros, "acao:1.1.1.1", 1000, 1, 60_000);
    expect(aindaDentroDaJanela.permitido).toBe(false);

    const jaForaDaJanela = avaliarJanela(registros, "acao:1.1.1.1", 61_000, 1, 60_000);
    expect(jaForaDaJanela.permitido).toBe(true);
  });

  it("chaves diferentes (ações ou IPs diferentes) não interferem entre si", () => {
    const registros = new Map();
    avaliarJanela(registros, "criarEntrega:1.1.1.1", 0, 1, 60_000);

    const outraAcao = avaliarJanela(registros, "excluirEntrega:1.1.1.1", 0, 1, 60_000);
    expect(outraAcao.permitido).toBe(true);

    const outroIp = avaliarJanela(registros, "criarEntrega:2.2.2.2", 0, 1, 60_000);
    expect(outroIp.permitido).toBe(true);
  });
});
