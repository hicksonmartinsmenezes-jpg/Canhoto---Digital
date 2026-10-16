import { describe, expect, it } from "vitest";
import { codigoErroPostgres, nomeConstraintPostgres } from "./errors";

describe("erros do Postgres", () => {
  it("lê o código direto do erro do driver", () => {
    expect(codigoErroPostgres({ code: "23505" })).toBe("23505");
  });

  it("lê o código e a constraint dentro do erro embrulhado pelo Drizzle", () => {
    const original = Object.assign(new Error("duplicate key"), {
      code: "23505",
      constraint_name: "veiculos_placa_key",
    });
    const embrulhado = new Error("Failed query: insert into veiculos ...", {
      cause: original,
    });
    expect(codigoErroPostgres(embrulhado)).toBe("23505");
    expect(nomeConstraintPostgres(embrulhado)).toBe("veiculos_placa_key");
  });

  it("devolve null quando não há código", () => {
    expect(codigoErroPostgres(new Error("x"))).toBeNull();
    expect(codigoErroPostgres(null)).toBeNull();
  });
});
