import { describe, expect, it } from "vitest";
import {
  codigoVerificacao,
  sha256Hex,
  situacaoIntegridade,
} from "@/lib/comprovante-integridade";

describe("situacaoIntegridade", () => {
  const h = sha256Hex(new Uint8Array([1, 2, 3]));

  it("confere quando as impressões digitais são iguais", () => {
    expect(situacaoIntegridade(h, h)).toBe("conferido");
  });
  it("aponta divergência quando o arquivo mudou", () => {
    expect(situacaoIntegridade(h, sha256Hex(new Uint8Array([9])))).toBe(
      "divergente"
    );
  });
  it("trata anexo antigo e arquivo ausente", () => {
    expect(situacaoIntegridade(null, h)).toBe("sem_registro");
    expect(situacaoIntegridade(h, null)).toBe("arquivo_ausente");
  });
});

describe("codigoVerificacao", () => {
  const base = {
    entregaId: "e1",
    numeroPedido: "123",
    numeroNfe: "456",
    recebedorNome: "Maria",
    concluidaEm: "2026-11-13T15:00:00.000Z",
    motoboyNome: "João",
    hashesAnexos: ["b", "a"],
  };

  it("é estável e independe da ordem dos anexos", () => {
    expect(codigoVerificacao(base)).toBe(
      codigoVerificacao({ ...base, hashesAnexos: ["a", "b"] })
    );
    expect(codigoVerificacao(base)).toMatch(/^[0-9a-f]{64}$/);
  });
  it("muda se qualquer dado mudar", () => {
    expect(codigoVerificacao(base)).not.toBe(
      codigoVerificacao({ ...base, recebedorNome: "Outra pessoa" })
    );
  });
});
