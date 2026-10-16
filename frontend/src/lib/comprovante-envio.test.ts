import { describe, expect, it, vi } from "vitest";
import type { RascunhoComprovante } from "./comprovante-pendente";
import {
  enviarRascunho,
  montarFormData,
  VALIDADE_RASCUNHO_MS,
  type DependenciasEnvio,
} from "./comprovante-envio";

const AGORA = 1_800_000_000_000;

function rascunho(
  parcial: Partial<RascunhoComprovante> = {}
): RascunhoComprovante {
  return {
    entregaId: "entrega-1",
    rotulo: "#1 · Cliente",
    fotoEntrega: new Blob(["foto"], { type: "image/jpeg" }),
    comprovantePix: null,
    criadoEm: AGORA - 60_000,
    tentativas: 0,
    rejeitado: false,
    ultimoErro: null,
    ...parcial,
  };
}

function criarDeps(
  atual: RascunhoComprovante | null,
  enviar: DependenciasEnvio["enviar"]
) {
  const deps = {
    ler: vi.fn().mockResolvedValue(atual),
    apagar: vi.fn().mockResolvedValue(undefined),
    atualizar: vi.fn().mockResolvedValue(undefined),
    enviar: vi.fn(enviar),
    agora: () => AGORA,
  };
  return deps satisfies DependenciasEnvio;
}

describe("montarFormData", () => {
  it("usa os nomes de campo que o servidor espera", () => {
    const formData = montarFormData(
      rascunho({
        comprovantePix: new Blob(["pix"], { type: "image/png" }),
      })
    );

    const foto = formData.get("fotoEntrega") as File;
    const pix = formData.get("comprovantePix") as File;

    expect(foto.type).toBe("image/jpeg");
    expect(foto.name).toBe("foto-entrega.jpg");
    expect(pix.name).toBe("comprovante-pix.png");
    expect(formData.has("assinatura")).toBe(false);
    expect(foto.size).toBe(4);
  });

  it("não inclui comprovante Pix nem foto do produto quando não existem", () => {
    const formData = montarFormData(rascunho());
    expect(formData.has("comprovantePix")).toBe(false);
    expect(formData.has("fotoProduto")).toBe(false);
  });

  it("inclui todas as fotos do produto, na ordem", () => {
    const formData = montarFormData(
      rascunho({
        fotosProduto: [
          new Blob(["produto-1"], { type: "image/webp" }),
          new Blob(["produto-2"], { type: "image/jpeg" }),
        ],
      })
    );
    const produtos = formData.getAll("fotoProduto") as File[];
    expect(produtos.map((foto) => foto.name)).toEqual([
      "foto-produto-1.webp",
      "foto-produto-2.jpg",
    ]);
    expect(produtos[0].type).toBe("image/webp");
  });

  it("aceita rascunho antigo com uma só foto do produto", () => {
    const formData = montarFormData(
      rascunho({ fotoProduto: new Blob(["produto"], { type: "image/png" }) })
    );
    const produtos = formData.getAll("fotoProduto") as File[];
    expect(produtos).toHaveLength(1);
    expect(produtos[0].name).toBe("foto-produto-1.png");
  });
});

describe("enviarRascunho", () => {
  it("apaga o rascunho quando o servidor confirma", async () => {
    const deps = criarDeps(rascunho(), async () => ({ ok: true }));

    await expect(enviarRascunho("entrega-1", deps)).resolves.toEqual({
      estado: "enviado",
    });
    expect(deps.apagar).toHaveBeenCalledWith("entrega-1");
    expect(deps.atualizar).not.toHaveBeenCalled();
  });

  it("trata 'já concluída' como sucesso e apaga o rascunho", async () => {
    const deps = criarDeps(rascunho(), async () => ({
      ok: true,
      jaConcluida: true,
    }));

    await expect(enviarRascunho("entrega-1", deps)).resolves.toEqual({
      estado: "enviado",
    });
    expect(deps.apagar).toHaveBeenCalledTimes(1);
  });

  it("mantém o rascunho e conta a tentativa quando falta conexão", async () => {
    const deps = criarDeps(rascunho({ tentativas: 2 }), async () => {
      throw new TypeError("Failed to fetch");
    });

    const resultado = await enviarRascunho("entrega-1", deps);

    expect(resultado.estado).toBe("rede");
    expect(resultado.mensagem).toMatch(/guardado neste aparelho/);
    expect(deps.apagar).not.toHaveBeenCalled();
    expect(deps.atualizar).toHaveBeenCalledWith(
      "entrega-1",
      expect.objectContaining({ tentativas: 3, rejeitado: false })
    );
  });

  it("marca como rejeitado quando o servidor recusa, sem apagar", async () => {
    const deps = criarDeps(rascunho(), async () => ({
      ok: false,
      error: "Entrega não encontrada, já concluída ou ainda não iniciada.",
    }));

    const resultado = await enviarRascunho("entrega-1", deps);

    expect(resultado).toEqual({
      estado: "rejeitado",
      mensagem: "Entrega não encontrada, já concluída ou ainda não iniciada.",
    });
    expect(deps.apagar).not.toHaveBeenCalled();
    expect(deps.atualizar).toHaveBeenCalledWith(
      "entrega-1",
      expect.objectContaining({ rejeitado: true, tentativas: 1 })
    );
  });

  it("nova tentativa depois de rejeição volta a aceitar sucesso", async () => {
    const deps = criarDeps(rascunho({ rejeitado: true, tentativas: 1 }), async () => ({
      ok: true,
    }));

    await expect(enviarRascunho("entrega-1", deps)).resolves.toEqual({
      estado: "enviado",
    });
  });

  it("não envia duas vezes a mesma entrega ao mesmo tempo", async () => {
    let liberar: (r: { ok: boolean }) => void = () => {};
    const deps = criarDeps(
      rascunho(),
      () => new Promise((resolve) => (liberar = resolve))
    );

    const primeiro = enviarRascunho("entrega-1", deps);
    // deixa o primeiro chegar até o envio
    await vi.waitFor(() => expect(deps.enviar).toHaveBeenCalledTimes(1));

    await expect(enviarRascunho("entrega-1", deps)).resolves.toEqual({
      estado: "ocupado",
    });

    liberar({ ok: true });
    await expect(primeiro).resolves.toEqual({ estado: "enviado" });
    expect(deps.enviar).toHaveBeenCalledTimes(1);
  });

  it("permite enviar de novo depois que o envio anterior terminou", async () => {
    const deps = criarDeps(rascunho(), async () => {
      throw new Error("offline");
    });

    await enviarRascunho("entrega-1", deps);
    await expect(enviarRascunho("entrega-1", deps)).resolves.toMatchObject({
      estado: "rede",
    });
    expect(deps.enviar).toHaveBeenCalledTimes(2);
  });

  it("devolve 'inexistente' sem rascunho", async () => {
    const deps = criarDeps(null, async () => ({ ok: true }));

    await expect(enviarRascunho("entrega-1", deps)).resolves.toEqual({
      estado: "inexistente",
    });
    expect(deps.enviar).not.toHaveBeenCalled();
  });

  it("descarta rascunho vencido sem enviar", async () => {
    const deps = criarDeps(
      rascunho({ criadoEm: AGORA - VALIDADE_RASCUNHO_MS - 1 }),
      async () => ({ ok: true })
    );

    await expect(enviarRascunho("entrega-1", deps)).resolves.toEqual({
      estado: "expirado",
    });
    expect(deps.apagar).toHaveBeenCalledWith("entrega-1");
    expect(deps.enviar).not.toHaveBeenCalled();
  });
});
