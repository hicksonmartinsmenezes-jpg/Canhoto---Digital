import { describe, expect, it } from "vitest";
import {
  nomeRecebedorValido,
  normalizarNomeRecebedor,
  normalizarVinculoRecebedor,
} from "./recebedor";

describe("nomeRecebedorValido", () => {
  it("aceita nome e sobrenome", () => {
    expect(nomeRecebedorValido("Maria da Silva")).toBe(true);
    expect(nomeRecebedorValido("Ana Lu")).toBe(true);
    expect(nomeRecebedorValido("  João   Souza ")).toBe(true);
  });
  it("recusa uma palavra só ou iniciais", () => {
    expect(nomeRecebedorValido("Alexandre")).toBe(false);
    expect(nomeRecebedorValido("A B")).toBe(false);
    expect(nomeRecebedorValido("João S")).toBe(false);
    expect(nomeRecebedorValido("")).toBe(false);
  });
  it("recusa nome acima do limite", () => {
    expect(nomeRecebedorValido(`Maria ${"a".repeat(130)}`)).toBe(false);
  });
});

describe("normalizarNomeRecebedor", () => {
  it("junta espaços repetidos", () => {
    expect(normalizarNomeRecebedor("  Maria   da  Silva ")).toBe("Maria da Silva");
  });
});

describe("normalizarVinculoRecebedor", () => {
  it("vazio vira null", () => {
    expect(normalizarVinculoRecebedor("   ")).toEqual({ ok: true, valor: null });
    expect(normalizarVinculoRecebedor(null)).toEqual({ ok: true, valor: null });
  });
  it("mantém o texto limpo", () => {
    expect(normalizarVinculoRecebedor(" Oficina  do João ")).toEqual({
      ok: true,
      valor: "Oficina do João",
    });
  });
  it("recusa acima do limite", () => {
    expect(normalizarVinculoRecebedor("x".repeat(121))).toEqual({ ok: false });
  });
});
