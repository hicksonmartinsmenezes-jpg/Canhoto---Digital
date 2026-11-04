import { describe, expect, it } from "vitest";
import {
  avaliarJanela,
  escolherIpDoCliente,
} from "./rate-limit-core";

function cab(valores: Record<string, string>) {
  const mapa = new Map(Object.entries(valores));
  return { get: (nome: string) => mapa.get(nome) ?? null };
}

describe("avaliarJanela", () => {
  it("permite tentativas até o limite dentro da janela", () => {
    const registros = new Map<string, { timestamps: number[] }>();
    for (let i = 0; i < 3; i++) {
      const resultado = avaliarJanela(registros, "acao:1.1.1.1", 1000 + i, 3, 60_000);
      expect(resultado.permitido).toBe(true);
    }
  });

  it("bloqueia a partir da tentativa que excede o limite", () => {
    const registros = new Map<string, { timestamps: number[] }>();
    avaliarJanela(registros, "acao:1.1.1.1", 1000, 3, 60_000);
    avaliarJanela(registros, "acao:1.1.1.1", 1001, 3, 60_000);
    avaliarJanela(registros, "acao:1.1.1.1", 1002, 3, 60_000);
    const quarta = avaliarJanela(registros, "acao:1.1.1.1", 1003, 3, 60_000);

    expect(quarta.permitido).toBe(false);
    expect(quarta.restante).toBe(0);
  });

  it("libera novamente depois que a janela desliza para frente", () => {
    const registros = new Map<string, { timestamps: number[] }>();
    avaliarJanela(registros, "acao:1.1.1.1", 0, 1, 60_000);

    const aindaDentroDaJanela = avaliarJanela(registros, "acao:1.1.1.1", 1000, 1, 60_000);
    expect(aindaDentroDaJanela.permitido).toBe(false);

    const jaForaDaJanela = avaliarJanela(registros, "acao:1.1.1.1", 61_000, 1, 60_000);
    expect(jaForaDaJanela.permitido).toBe(true);
  });

  it("isola ações e IPs diferentes", () => {
    const registros = new Map<string, { timestamps: number[] }>();
    avaliarJanela(registros, "criarEntrega:1.1.1.1", 0, 1, 60_000);

    expect(avaliarJanela(registros, "excluirEntrega:1.1.1.1", 0, 1, 60_000).permitido).toBe(true);
    expect(avaliarJanela(registros, "criarEntrega:2.2.2.2", 0, 1, 60_000).permitido).toBe(true);
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

  it("usa a última entrada de x-forwarded-for, não a primeira", () => {
    expect(
      escolherIpDoCliente(cab({ "x-forwarded-for": "9.9.9.9, 198.51.100.7" }))
    ).toBe("198.51.100.7");
  });

  it("cai para x-real-ip e depois para desconhecido", () => {
    expect(escolherIpDoCliente(cab({ "x-real-ip": "10.0.0.5" }))).toBe("10.0.0.5");
    expect(escolherIpDoCliente(cab({}))).toBe("desconhecido");
  });
});
