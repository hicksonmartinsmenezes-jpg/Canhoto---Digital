import { describe, expect, it } from "vitest";
import {
  anexarHashes,
  calcularHashesComprovante,
  sha256DoBlob,
} from "./hash-dispositivo";

describe("hash-dispositivo", () => {
  it("calcula SHA-256 conhecido", async () => {
    expect(await sha256DoBlob(new Blob(["abc"]))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("calcula hashes de todos os arquivos, em ordem", async () => {
    const h = await calcularHashesComprovante({
      fotoEntrega: new Blob(["abc"]),
      fotosProduto: [new Blob(["abc"]), new Blob(["x"])],
    });
    expect(h.comprovantePix).toBeNull();
    expect(h.fotosProduto).toHaveLength(2);
    expect(h.fotosProduto[0]).toBe(h.fotoEntrega);
  });

  it("anexa campos ao FormData e mantém posição vazia", () => {
    const fd = new FormData();
    anexarHashes(fd, {
      fotoEntrega: "a".repeat(64),
      comprovantePix: null,
      fotosProduto: [null, "b".repeat(64)],
    });
    expect(fd.get("hashFotoEntrega")).toBe("a".repeat(64));
    expect(fd.has("hashComprovantePix")).toBe(false);
    expect(fd.getAll("hashFotoProduto")).toEqual(["", "b".repeat(64)]);
  });

  it("não falha sem hashes (rascunho antigo)", () => {
    const fd = new FormData();
    anexarHashes(fd, undefined);
    expect([...fd.keys()]).toEqual([]);
  });
});
