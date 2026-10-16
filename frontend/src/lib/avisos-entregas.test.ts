import { describe, expect, it } from "vitest";
import { calcularAvisos, mensagemDoAviso } from "./avisos-entregas";

const e = (id: string, status = "pendente") => ({
  id,
  numero: `#${id}`,
  clienteNome: `Cliente ${id}`,
  status,
});

describe("calcularAvisos", () => {
  it("na primeira abertura só memoriza, sem avisar", () => {
    const r = calcularAvisos([e("1"), e("2")], null, "2026-10-07");
    expect(r.novas).toEqual([]);
    expect(r.retiradas).toEqual([]);
    expect(r.vistas.pendentes.map((p) => p.id)).toEqual(["1", "2"]);
  });

  it("ao virar o dia recomeça sem avisar", () => {
    const antes = calcularAvisos([e("1")], null, "2026-10-06").vistas;
    const r = calcularAvisos([e("2")], antes, "2026-10-07");
    expect(r.novas).toEqual([]);
    expect(r.retiradas).toEqual([]);
  });

  it("avisa de entrega nova", () => {
    const antes = calcularAvisos([e("1")], null, "d").vistas;
    const r = calcularAvisos([e("1"), e("2")], antes, "d");
    expect(r.novas.map((n) => n.id)).toEqual(["2"]);
    expect(r.retiradas).toEqual([]);
  });

  it("não avisa de novo depois de memorizar", () => {
    const antes = calcularAvisos([e("1")], null, "d").vistas;
    const meio = calcularAvisos([e("1"), e("2")], antes, "d");
    const r = calcularAvisos([e("1"), e("2")], meio.vistas, "d");
    expect(r.novas).toEqual([]);
  });

  it("avisa quando uma pendente some da lista (cancelada)", () => {
    const antes = calcularAvisos([e("1"), e("2")], null, "d").vistas;
    const r = calcularAvisos([e("1")], antes, "d");
    expect(r.retiradas.map((n) => n.id)).toEqual(["2"]);
  });

  it("entrega concluída pelo motorista não conta como retirada", () => {
    const antes = calcularAvisos([e("1"), e("2")], null, "d").vistas;
    const r = calcularAvisos([e("1"), e("2", "entregue")], antes, "d");
    expect(r.retiradas).toEqual([]);
    expect(r.novas).toEqual([]);
  });
});

describe("mensagemDoAviso", () => {
  it("uma nova", () => {
    expect(mensagemDoAviso([{ numero: "#7", clienteNome: "Ana" }], [])).toEqual({
      titulo: "Nova entrega #7",
      detalhe: "Ana",
    });
  });

  it("várias novas", () => {
    expect(
      mensagemDoAviso(
        [
          { numero: "#7", clienteNome: "Ana" },
          { numero: "#8", clienteNome: "Bia" },
        ],
        []
      )
    ).toEqual({ titulo: "2 entregas novas", detalhe: "#7, #8" });
  });

  it("cancelada", () => {
    expect(mensagemDoAviso([], [{ numero: "#7", clienteNome: "Ana" }])?.titulo).toBe(
      "Entrega #7 cancelada"
    );
  });

  it("nada a avisar", () => {
    expect(mensagemDoAviso([], [])).toBeNull();
  });
});
