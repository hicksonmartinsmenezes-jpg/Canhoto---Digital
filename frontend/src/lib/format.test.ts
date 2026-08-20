import { describe, expect, it } from "vitest";
import {
  formatBRL,
  formatDateBR,
  maskCurrencyInput,
  maskPhoneInput,
  parseCurrencyInput,
} from "./format";

describe("formatBRL", () => {
  it("formata número como moeda brasileira", () => {
    expect(formatBRL(1234.5)).toMatch(/^R\$\s?1\.234,50$/);
  });

  it("formata zero corretamente", () => {
    expect(formatBRL(0)).toMatch(/^R\$\s?0,00$/);
  });
});

describe("formatDateBR", () => {
  it("converte data ISO simples (date) para dd/mm/aaaa", () => {
    expect(formatDateBR("2026-08-18")).toBe("18/08/2026");
  });

  it("converte timestamptz do Postgres, ignorando a parte de hora", () => {
    expect(formatDateBR("2026-08-18T14:32:00+00:00")).toBe("18/08/2026");
  });
});

describe("maskCurrencyInput", () => {
  it("trata os dígitos como centavos, tipo maquininha de cartão", () => {
    expect(maskCurrencyInput("12825")).toBe("128,25");
  });

  it("devolve string vazia quando não há dígitos", () => {
    expect(maskCurrencyInput("")).toBe("");
    expect(maskCurrencyInput("abc")).toBe("");
  });

  it("ignora caracteres não numéricos misturados", () => {
    expect(maskCurrencyInput("R$ 5,00")).toBe("5,00");
  });
});

describe("parseCurrencyInput", () => {
  it("converte texto mascarado de volta para número", () => {
    expect(parseCurrencyInput("1.128,25")).toBe(1128.25);
  });

  it("devolve 0 para entrada vazia ou inválida", () => {
    expect(parseCurrencyInput("")).toBe(0);
  });
});

describe("maskPhoneInput", () => {
  it("formata celular (11 dígitos)", () => {
    expect(maskPhoneInput("11987654321")).toBe("(11) 98765-4321");
  });

  it("formata fixo (10 dígitos)", () => {
    expect(maskPhoneInput("1133334444")).toBe("(11) 3333-4444");
  });

  it("lida com digitação parcial sem quebrar", () => {
    expect(maskPhoneInput("11")).toBe("(11");
    expect(maskPhoneInput("119")).toBe("(11) 9");
  });

  it("devolve string vazia sem dígitos", () => {
    expect(maskPhoneInput("")).toBe("");
    expect(maskPhoneInput("abc")).toBe("");
  });

  it("trunca em 11 dígitos mesmo com entrada maior", () => {
    expect(maskPhoneInput("119876543219999")).toBe("(11) 98765-4321");
  });
});
