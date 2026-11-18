import { describe, expect, it } from "vitest";
import { temVinculoFiscal, vinculoFoiApagado } from "./vinculo-fiscal";

describe("temVinculoFiscal", () => {
  it("aceita só com o pedido", () => {
    expect(
      temVinculoFiscal({
        numeroPedido: " 4821 ",
        numeroNfe: "",
        clienteFinal: false,
      })
    ).toBe(true);
  });

  it("aceita só com a NF-e", () => {
    expect(
      temVinculoFiscal({
        numeroPedido: "",
        numeroNfe: "12345",
        clienteFinal: false,
      })
    ).toBe(true);
  });

  it("recusa quando os dois estão vazios", () => {
    expect(
      temVinculoFiscal({ numeroPedido: "  ", numeroNfe: "", clienteFinal: false })
    ).toBe(false);
  });

  it("consumidor final precisa do pedido, porque a NF-e é ignorada", () => {
    expect(
      temVinculoFiscal({
        numeroPedido: "",
        numeroNfe: "999",
        clienteFinal: true,
      })
    ).toBe(false);
    expect(
      temVinculoFiscal({
        numeroPedido: "77",
        numeroNfe: "",
        clienteFinal: true,
      })
    ).toBe(true);
  });
});

describe("vinculoFoiApagado", () => {
  const semVinculo = {
    numeroPedido: "",
    numeroNfe: "",
    clienteFinal: false,
  };

  it("acusa quando a entrega tinha pedido e ficou sem nada", () => {
    expect(
      vinculoFoiApagado({ numeroPedido: "4821", numeroNfe: null }, semVinculo)
    ).toBe(true);
  });

  it("deixa editar entrega antiga que já estava sem vínculo", () => {
    expect(
      vinculoFoiApagado({ numeroPedido: null, numeroNfe: null }, semVinculo)
    ).toBe(false);
  });

  it("deixa trocar a NF-e pelo pedido", () => {
    expect(
      vinculoFoiApagado(
        { numeroPedido: null, numeroNfe: "12345" },
        { numeroPedido: "4821", numeroNfe: "", clienteFinal: false }
      )
    ).toBe(false);
  });
});
