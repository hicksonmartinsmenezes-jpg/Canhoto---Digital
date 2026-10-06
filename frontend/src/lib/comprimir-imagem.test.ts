import { describe, expect, it } from "vitest";
import {
  calcularDimensoes,
  comprimirImagem,
  nomeComExtensaoJpg,
} from "./comprimir-imagem";

describe("calcularDimensoes", () => {
  it("mantém imagens que já cabem no limite", () => {
    expect(calcularDimensoes(1200, 800, 1600)).toEqual({ largura: 1200, altura: 800 });
  });

  it("reduz mantendo a proporção (paisagem)", () => {
    expect(calcularDimensoes(4000, 3000, 1600)).toEqual({ largura: 1600, altura: 1200 });
  });

  it("reduz mantendo a proporção (retrato)", () => {
    expect(calcularDimensoes(3000, 4000, 1600)).toEqual({ largura: 1200, altura: 1600 });
  });

  it("nunca devolve dimensão zero", () => {
    expect(calcularDimensoes(10000, 1, 1600)).toEqual({ largura: 1600, altura: 1 });
  });
});

describe("nomeComExtensaoJpg", () => {
  it("troca a extensão", () => {
    expect(nomeComExtensaoJpg("IMG_0001.HEIC")).toBe("IMG_0001.jpg");
  });
  it("usa nome padrão quando vazio", () => {
    expect(nomeComExtensaoJpg("")).toBe("foto.jpg");
  });
});

describe("comprimirImagem", () => {
  it("devolve o original fora do navegador (sem document)", async () => {
    const arquivo = new File([new Uint8Array(500 * 1024)], "a.jpg", { type: "image/jpeg" });
    await expect(comprimirImagem(arquivo)).resolves.toBe(arquivo);
  });

  it("não mexe em arquivo que não é imagem", async () => {
    const arquivo = new File(["x"], "a.txt", { type: "text/plain" });
    await expect(comprimirImagem(arquivo)).resolves.toBe(arquivo);
  });
});
