import { describe, expect, it } from "vitest";
import { TREINAMENTOS, isPerfilTreinamento } from "@/lib/treinamentos";

describe("catálogo de treinamentos", () => {
  it("mantém slugs únicos e compatíveis com o banco", () => {
    const slugs = TREINAMENTOS.map((treinamento) => treinamento.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("exige conteúdo mínimo em cada treinamento", () => {
    for (const treinamento of TREINAMENTOS) {
      expect(treinamento.titulo.trim().length).toBeGreaterThan(0);
      expect(treinamento.objetivo.trim().length).toBeGreaterThan(0);
      expect(treinamento.duracaoMinutos).toBeGreaterThan(0);
      expect(treinamento.perfis.length).toBeGreaterThan(0);
      expect(treinamento.passos.length).toBeGreaterThan(0);
    }
  });

  it("reconhece somente perfis suportados nesta versão", () => {
    expect(isPerfilTreinamento("administrativo")).toBe(true);
    expect(isPerfilTreinamento("expedicao")).toBe(true);
    expect(isPerfilTreinamento("motorista")).toBe(true);
    expect(isPerfilTreinamento("frota")).toBe(false);
    expect(isPerfilTreinamento(undefined)).toBe(false);
  });
});
