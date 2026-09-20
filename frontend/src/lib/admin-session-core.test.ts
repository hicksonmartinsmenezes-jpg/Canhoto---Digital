import { describe, expect, it } from "vitest";
import {
  criarTokenSessaoAdmin,
  verificarTokenSessaoAdmin,
} from "./admin-session-core";

describe("sessão administrativa", () => {
  const segredo = "segredo-admin-teste-com-comprimento-suficiente";
  const agora = Date.UTC(2026, 8, 19, 20, 0, 0);

  it("aceita token válido", async () => {
    const token = await criarTokenSessaoAdmin("admin-1", segredo, agora);

    await expect(
      verificarTokenSessaoAdmin(token, segredo, agora + 1000)
    ).resolves.toBe("admin-1");
  });

  it("rejeita token adulterado", async () => {
    const token = await criarTokenSessaoAdmin("admin-1", segredo, agora);
    const adulterado = token.replace("admin-1", "admin-2");

    await expect(
      verificarTokenSessaoAdmin(adulterado, segredo, agora + 1000)
    ).resolves.toBeNull();
  });

  it("rejeita segredo diferente", async () => {
    const token = await criarTokenSessaoAdmin("admin-1", segredo, agora);

    await expect(
      verificarTokenSessaoAdmin(
        token,
        "outro-segredo-com-comprimento-suficiente",
        agora + 1000
      )
    ).resolves.toBeNull();
  });

  it("rejeita token expirado", async () => {
    const token = await criarTokenSessaoAdmin("admin-1", segredo, agora);

    await expect(
      verificarTokenSessaoAdmin(
        token,
        segredo,
        agora + 9 * 60 * 60 * 1000
      )
    ).resolves.toBeNull();
  });
});
