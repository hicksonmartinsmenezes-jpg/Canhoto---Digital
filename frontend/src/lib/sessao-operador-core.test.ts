import { describe, expect, it } from "vitest";
import {
  sessaoPodeAcessarSetor,
  setorIdParaFiltro,
  type SessaoOperador,
} from "./sessao-operador-core";

const admin: SessaoOperador = { tipo: "admin", usuarioAdminId: "a1" };
const gestor = (setorId: string | null): SessaoOperador => ({
  tipo: "gestor_setor",
  colaboradorId: "c1",
  setorId,
});

describe("setorIdParaFiltro", () => {
  it("admin não filtra", () => {
    expect(setorIdParaFiltro(admin)).toBeUndefined();
  });
  it("colaborador também não filtra: vê os mesmos dados do admin", () => {
    expect(setorIdParaFiltro(gestor("s1"))).toBeUndefined();
    expect(setorIdParaFiltro(gestor(null))).toBeUndefined();
  });
  it("sem sessão falha fechado (null, nunca undefined)", () => {
    expect(setorIdParaFiltro(null)).toBeNull();
  });
});

describe("sessaoPodeAcessarSetor", () => {
  it("admin acessa qualquer setor", () => {
    expect(sessaoPodeAcessarSetor(admin, "s9")).toBe(true);
    expect(sessaoPodeAcessarSetor(admin, null)).toBe(true);
  });
  it("colaborador acessa entregas de qualquer setor, como o admin", () => {
    expect(sessaoPodeAcessarSetor(gestor("s1"), "s1")).toBe(true);
    expect(sessaoPodeAcessarSetor(gestor("s1"), "s2")).toBe(true);
    expect(sessaoPodeAcessarSetor(gestor(null), null)).toBe(true);
  });
  it("sem sessão nega", () => {
    expect(sessaoPodeAcessarSetor(null, "s1")).toBe(false);
  });
});
