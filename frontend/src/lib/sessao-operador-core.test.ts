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
  it("gestor filtra pelo próprio setor", () => {
    expect(setorIdParaFiltro(gestor("s1"))).toBe("s1");
  });
  it("gestor sem setor não vê nada (null)", () => {
    expect(setorIdParaFiltro(gestor(null))).toBeNull();
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
  it("gestor só acessa o próprio setor", () => {
    expect(sessaoPodeAcessarSetor(gestor("s1"), "s1")).toBe(true);
    expect(sessaoPodeAcessarSetor(gestor("s1"), "s2")).toBe(false);
    expect(sessaoPodeAcessarSetor(gestor("s1"), null)).toBe(false);
  });
  it("gestor sem setor nunca acessa, nem entrega sem setor", () => {
    expect(sessaoPodeAcessarSetor(gestor(null), null)).toBe(false);
  });
  it("sem sessão nega", () => {
    expect(sessaoPodeAcessarSetor(null, "s1")).toBe(false);
  });
});
