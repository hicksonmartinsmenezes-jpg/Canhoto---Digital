import { describe, expect, it } from "vitest";
import {
  hostEhPublicoMotorista,
  requisicaoEhPublicaMotorista,
} from "./public-motorista-host";

function cab(valores: Record<string, string>) {
  const mapa = new Map(Object.entries(valores));
  return { get: (nome: string) => mapa.get(nome) ?? null };
}

describe("host público da área do motorista", () => {
  it("aceita o hostname configurado", () => {
    expect(
      hostEhPublicoMotorista(
        "entregas.exemplo.com.br",
        "entregas.exemplo.com.br"
      )
    ).toBe(true);
  });

  it("aceita Quick Tunnel trycloudflare", () => {
    expect(
      hostEhPublicoMotorista("quiet-river-123.trycloudflare.com")
    ).toBe(true);
  });

  it("não confunde domínio malicioso com trycloudflare", () => {
    expect(
      hostEhPublicoMotorista("quiet-river.trycloudflare.com.exemplo.org")
    ).toBe(false);
  });

  it("não trata localhost como host público", () => {
    expect(hostEhPublicoMotorista("localhost")).toBe(false);
  });
});

describe("requisição pública do motorista (cabeçalhos)", () => {
  it("marca como pública pelo Host do túnel", () => {
    expect(
      requisicaoEhPublicaMotorista(cab({ host: "a-b-c.trycloudflare.com" }))
    ).toBe(true);
  });

  it("X-Forwarded-Host forjado não esconde o host público", () => {
    expect(
      requisicaoEhPublicaMotorista(
        cab({
          host: "a-b-c.trycloudflare.com",
          "x-forwarded-host": "localhost",
        })
      )
    ).toBe(true);
  });

  it("considera todos os valores de uma lista em X-Forwarded-Host", () => {
    expect(
      requisicaoEhPublicaMotorista(
        cab({
          host: "localhost:3004",
          "x-forwarded-host": "localhost, a-b-c.trycloudflare.com",
        })
      )
    ).toBe(true);
  });

  it("cabeçalhos do Cloudflare marcam como pública mesmo com Host local", () => {
    expect(
      requisicaoEhPublicaMotorista(
        cab({ host: "localhost:3004", "cf-connecting-ip": "203.0.113.9" })
      )
    ).toBe(true);
  });

  it("acesso local da loja não é público", () => {
    expect(
      requisicaoEhPublicaMotorista(cab({ host: "192.168.0.10:3004" }))
    ).toBe(false);
  });

  it("respeita PUBLIC_MOTORISTA_HOST", () => {
    expect(
      requisicaoEhPublicaMotorista(
        cab({ host: "entregas.exemplo.com.br" }),
        "entregas.exemplo.com.br"
      )
    ).toBe(true);
  });
});
