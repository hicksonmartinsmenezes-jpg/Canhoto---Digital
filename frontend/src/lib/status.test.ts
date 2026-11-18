import { describe, expect, it } from "vitest";
import {
  FORMA_PAGAMENTO_LABEL,
  isSituacaoEntrega,
  isStatusEntrega,
  SITUACAO_BADGE_CLASSES,
  SITUACAO_LABEL,
  situacaoEntrega,
  STATUS_BADGE_CLASSES,
  STATUS_HEX,
  STATUS_LABEL,
} from "./status";

// Testes de "contrato": o schema v2 tem exatamente 3 status e 6 formas de
// pagamento (ver claude/modelo-de-dados-site.md). Cada um dos 3 mapas de
// status (label, hex, classe de badge) precisa cobrir o mesmo conjunto de
// chaves — o histórico do projeto já teve mais de um caso de campo
// adicionado/renomeado em um lugar e esquecido em outro (ver merge
// divergente de 20/08/2026 nas notas do projeto), então esse teste existe
// especificamente pra pegar esse tipo de regressão cedo, no CI.
describe("status", () => {
  const statusEsperados = ["pendente", "entregue", "cancelado"].sort();
  const formasEsperadas = [
    "dinheiro",
    "pix",
    "debito",
    "cartao_1x",
    "prazo",
    "boleto",
  ].sort();

  it("STATUS_LABEL cobre os 3 status do schema v2", () => {
    expect(Object.keys(STATUS_LABEL).sort()).toEqual(statusEsperados);
  });

  it("STATUS_HEX cobre o mesmo conjunto de status que STATUS_LABEL", () => {
    expect(Object.keys(STATUS_HEX).sort()).toEqual(statusEsperados);
  });

  it("STATUS_BADGE_CLASSES cobre o mesmo conjunto de status que STATUS_LABEL", () => {
    expect(Object.keys(STATUS_BADGE_CLASSES).sort()).toEqual(statusEsperados);
  });

  it("FORMA_PAGAMENTO_LABEL cobre as 6 formas de pagamento do schema v2", () => {
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

describe("situacaoEntrega", () => {
  it("separa pendente parada de pendente em rota", () => {
    expect(situacaoEntrega("pendente", null)).toBe("aguardando");
    expect(situacaoEntrega("pendente", "09:30:00")).toBe("em_rota");
    expect(situacaoEntrega("entregue", "09:30:00")).toBe("entregue");
    expect(situacaoEntrega("cancelado", null)).toBe("cancelado");
  });

  it("valida a situação vinda da URL", () => {
    expect(isSituacaoEntrega("em_rota")).toBe(true);
    expect(isSituacaoEntrega("pendente")).toBe(false);
    expect(isSituacaoEntrega("")).toBe(false);
  });

  it("rótulos e cores cobrem as 4 situações", () => {
    const esperadas = ["aguardando", "cancelado", "em_rota", "entregue"];
    expect(Object.keys(SITUACAO_LABEL).sort()).toEqual(esperadas);
    expect(Object.keys(SITUACAO_BADGE_CLASSES).sort()).toEqual(esperadas);
  });
});
