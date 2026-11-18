import { describe, expect, it } from "vitest";
import { diaNaLoja, horaNaLoja } from "./fuso-loja";

describe("fuso da loja", () => {
  // 12:57 UTC = 09:57 em Brasília: era exatamente o erro de 3 h.
  const meioDia = new Date("2026-11-18T12:57:03Z");

  it("dá a hora de Brasília, não a do processo", () => {
    expect(horaNaLoja(meioDia)).toBe("09:57:03");
  });

  it("dá o dia de Brasília", () => {
    expect(diaNaLoja(meioDia)).toBe("2026-11-18");
  });

  it("depois das 21h, o dia na loja ainda é o de ontem em UTC", () => {
    const madrugadaUtc = new Date("2026-11-19T02:30:00Z");
    expect(diaNaLoja(madrugadaUtc)).toBe("2026-11-18");
    expect(horaNaLoja(madrugadaUtc)).toBe("23:30:00");
  });
});
