import { describe, expect, it } from "vitest";
import {
  descreverAlteracoes,
  observacaoDeAlteracoes,
  type DadosAuditados,
} from "./auditoria-entrega";

const base: DadosAuditados = {
  data: "2026-10-06",
  clienteNome: "Maria",
  valorPagamento: 50,
  formaPagamento: "dinheiro",
  motoboyId: "m1",
};

// toLocaleString usa espaço não separável entre "R$" e o número.
const normalizar = (s: string) => s.replace(/ /g, " ");

describe("descreverAlteracoes", () => {
  it("não acusa nada quando só mudam campos não auditados", () => {
    expect(descreverAlteracoes(base, { ...base })).toEqual([]);
  });

  it("ignora diferença de centavos por arredondamento e espaços no nome", () => {
    expect(
      descreverAlteracoes(base, {
        ...base,
        valorPagamento: 50.000001,
        clienteNome: " Maria ",
      })
    ).toEqual([]);
  });

  it("descreve valor e forma de pagamento", () => {
    const mudancas = descreverAlteracoes(base, {
      ...base,
      valorPagamento: 60,
      formaPagamento: "pix",
    }).map(normalizar);
    expect(mudancas).toEqual([
      "Valor: R$ 50,00 → R$ 60,00",
      "Pagamento: Dinheiro → Pix",
    ]);
  });

  it("usa o nome do motorista e trata ausência", () => {
    expect(
      descreverAlteracoes(
        base,
        { ...base, motoboyId: "m2" },
        { m1: "João", m2: "Pedro" }
      )
    ).toEqual(["Motorista: João → Pedro"]);
    expect(descreverAlteracoes(base, { ...base, motoboyId: null }, {})).toEqual(
      ["Motorista: motorista removido → sem motorista"]
    );
  });

  it("descreve data e cliente", () => {
    expect(
      descreverAlteracoes(base, {
        ...base,
        data: "2026-10-07",
        clienteNome: "Maria Souza",
      })
    ).toEqual(["Data: 06/10/2026 → 07/10/2026", "Cliente: Maria → Maria Souza"]);
  });

  it("monta a observação do histórico", () => {
    expect(observacaoDeAlteracoes(["A: 1 → 2", "B: x → y"])).toBe(
      "Dados alterados — A: 1 → 2; B: x → y."
    );
  });
});
