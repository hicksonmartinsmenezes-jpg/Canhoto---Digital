import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ getDb: () => null }));

import { calcularTotaisRelatorio } from "./entregas";

// Intl usa espaço não separável entre "R$" e o número.
const brl = (texto: string) => texto.replace(/\u00a0/g, " ");

describe("calcularTotaisRelatorio", () => {
  it("canceladas contam na quantidade mas não no valor nem no ticket", () => {
    const totais = calcularTotaisRelatorio([
      { status: "entregue", valorNumerico: 70, formaPagamento: "dinheiro" },
      { status: "entregue", valorNumerico: 70, formaPagamento: "dinheiro" },
      { status: "pendente", valorNumerico: 70, formaPagamento: "pix" },
      { status: "cancelado", valorNumerico: 50, formaPagamento: "dinheiro" },
    ]);
    expect(totais.quantidade).toBe(4);
    expect(totais.entregues).toBe(2);
    expect(totais.canceladas).toBe(1);
    expect(brl(totais.valorTotal)).toBe("R$ 210,00");
    expect(brl(totais.valorEntregue)).toBe("R$ 140,00");
    expect(brl(totais.ticketMedio)).toBe("R$ 70,00");
    expect(
      totais.porFormaPagamento.map((p) => ({ ...p, valor: brl(p.valor) }))
    ).toEqual([
      { formaPagamento: "dinheiro", quantidade: 2, valor: "R$ 140,00" },
      { formaPagamento: "pix", quantidade: 1, valor: "R$ 70,00" },
    ]);
  });

  it("sem entregas: tudo zero", () => {
    const totais = calcularTotaisRelatorio([]);
    expect(brl(totais.valorTotal)).toBe("R$ 0,00");
    expect(brl(totais.ticketMedio)).toBe("R$ 0,00");
  });
});
