import { describe, expect, it } from "vitest";
import {
  criarTokenSessao,
  verificarTokenSessao,
} from "./motorista-session-core";

const SEGREDO = "segredo-de-teste-forte";
const AGORA = 1_760_000_000_000;

describe("sessão do motorista", () => {
  it("cria um token que pode ser validado", async () => {
    const token = await criarTokenSessao("motorista-123", SEGREDO, AGORA);

    await expect(
      verificarTokenSessao(token, SEGREDO, AGORA)
    ).resolves.toBe("motorista-123");
  });

  it("rejeita token adulterado", async () => {
    const token = await criarTokenSessao("motorista-123", SEGREDO, AGORA);
    const partes = token.split(".");
    partes[0] = "outro-motorista";

    await expect(
      verificarTokenSessao(partes.join("."), SEGREDO, AGORA)
    ).resolves.toBeNull();
  });

  it("rejeita token assinado com outro segredo", async () => {
    const token = await criarTokenSessao("motorista-123", SEGREDO, AGORA);

    await expect(
      verificarTokenSessao(token, "outro-segredo", AGORA)
    ).resolves.toBeNull();
  });

  it("rejeita token expirado", async () => {
    const token = await criarTokenSessao("motorista-123", SEGREDO, AGORA);
    const umPoucoDepois = AGORA + 12 * 60 * 60 * 1000 + 1;

    await expect(
      verificarTokenSessao(token, SEGREDO, umPoucoDepois)
    ).resolves.toBeNull();
  });

  it("rejeita token com formato inválido", async () => {
    await expect(
      verificarTokenSessao("nao-e-um-token-valido", SEGREDO, AGORA)
    ).resolves.toBeNull();
  });
});
