import { describe, expect, it } from "vitest";
import {
  avaliarJanela,
  contarNaJanela,
  escolherIpDoCliente,
  registrarOcorrencia,
} from "./rate-limit-core";

function cab(valores: Record<string, string>) {
  const mapa = new Map(Object.entries(valores));
  return { get: (nome: string) => mapa.get(nome) ?? null };
}

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

describe("contagem de falhas por conta", () => {
  it("conta só ocorrências dentro da janela", () => {
    const registros = new Map();
    registrarOcorrencia(registros, "login:79", 0, 1000);
    registrarOcorrencia(registros, "login:79", 500, 1000);
    expect(contarNaJanela(registros, "login:79", 600, 1000)).toBe(2);
    expect(contarNaJanela(registros, "login:79", 1200, 1000)).toBe(1);
    expect(contarNaJanela(registros, "outra", 600, 1000)).toBe(0);
  });
});

describe("escolherIpDoCliente", () => {
  it("prefere cf-connecting-ip", () => {
    expect(
      escolherIpDoCliente(
        cab({ "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1" })
      )
    ).toBe("203.0.113.9");
  });

  it("usa a última entrada de x-forwarded-for, não a primeira (forjável)", () => {
    expect(
      escolherIpDoCliente(cab({ "x-forwarded-for": "9.9.9.9, 198.51.100.7" }))
    ).toBe("198.51.100.7");
  });

  it("cai para x-real-ip e depois 'desconhecido'", () => {
    expect(escolherIpDoCliente(cab({ "x-real-ip": "10.0.0.5" }))).toBe("10.0.0.5");
    expect(escolherIpDoCliente(cab({}))).toBe("desconhecido");
  });
});
