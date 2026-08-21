import { describe, expect, it } from "vitest";
import {
  FORMA_PAGAMENTO_LABEL,
  isStatusEntrega,
  STATUS_BADGE_CLASSES,
  STATUS_HEX,
  STATUS_LABEL,
} from "./status";

// Testes de "contrato": o schema v2 tem exatamente 3 status e 5 formas de
// pagamento (ver claude/modelo-de-dados-site.md). Cada um dos 3 mapas de
// status (label, hex, classe de badge) precisa cobrir o mesmo conjunto de
// chaves — o histórico do projeto já teve mais de um caso de campo
// adicionado/renomeado em um lugar e esquecido em outro (ver merge
// divergente de 20/08/2026 nas notas do projeto), então esse teste existe
// especificamente pra pegar esse tipo de regressão cedo, no CI.
describe("status", () => {
  const statusEsperados = ["pendente", "entregue", "cancelado"].sort();
  const formasEsperadas = ["dinheiro", "pix", "debito", "cartao_1x", "prazo"].sort();

  it("STATUS_LABEL cobre os 3 status do schema v2", () => {
    expect(Object.keys(STATUS_LABEL).sort()).toEqual(statusEsperados);
  });

  it("STATUS_HEX cobre o mesmo conjunto de status que STATUS_LABEL", () => {
    expect(Object.keys(STATUS_HEX).sort()).toEqual(statusEsperados);
  });

  it("STATUS_BADGE_CLASSES cobre o mesmo conjunto de status que STATUS_LABEL", () => {
    expect(Object.keys(STATUS_BADGE_CLASSES).sort()).toEqual(statusEsperados);
  });

  it("FORMA_PAGAMENTO_LABEL cobre as 5 formas de pagamento do schema v2", () => {
    expect(Object.keys(FORMA_PAGAMENTO_LABEL).sort()).toEqual(formasEsperadas);
  });

  it("cada status tem uma cor hex válida e uma classe de badge não vazia", () => {
    for (const status of Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]) {
      expect(STATUS_HEX[status]).toMatch(/^#[0-9a-f]{6}$/i);
      expect(STATUS_BADGE_CLASSES[status].length).toBeGreaterThan(0);
    }
  });

  describe("isStatusEntrega", () => {
    it("aceita os 3 status válidos", () => {
      expect(isStatusEntrega("pendente")).toBe(true);
      expect(isStatusEntrega("entregue")).toBe(true);
      expect(isStatusEntrega("cancelado")).toBe(true);
    });

    it("rejeita string vazia, valor desconhecido e tipos não-string (searchParam solto)", () => {
      expect(isStatusEntrega("")).toBe(false);
      expect(isStatusEntrega("entregues")).toBe(false);
      expect(isStatusEntrega(undefined)).toBe(false);
      expect(isStatusEntrega(null)).toBe(false);
      expect(isStatusEntrega(["pendente"])).toBe(false);
    });
  });
});
