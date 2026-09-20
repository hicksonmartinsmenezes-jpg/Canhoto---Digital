import { describe, expect, it } from "vitest";
import { hostEhPublicoMotorista } from "./public-motorista-host";

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
