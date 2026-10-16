import { createPublicKey, createVerify, generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  enviarPush,
  limparCacheFcm,
  montarJwtConta,
  obterContaServico,
  pushConfigurado,
} from "./fcm";
import {
  mensagemEntregaNova,
  mensagemEntregaRetirada,
} from "./avisar-motorista";

vi.mock("@/lib/db", () => ({ getDb: () => null }));

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const CONTA = {
  project_id: "canhoto-teste",
  client_email: "push@canhoto-teste.iam.gserviceaccount.com",
  private_key: privateKey,
};

const TOKEN_APARELHO = "a".repeat(40);

function decodificar(parte: string) {
  return JSON.parse(Buffer.from(parte, "base64url").toString("utf8"));
}

beforeEach(() => {
  limparCacheFcm();
  delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  delete process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("configuração", () => {
  it("fica desligado sem variável de ambiente", () => {
    expect(pushConfigurado()).toBe(false);
  });

  it("lê a conta de serviço do JSON em variável", () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify(CONTA);
    expect(obterContaServico()?.project_id).toBe("canhoto-teste");
    expect(pushConfigurado()).toBe(true);
  });

  it("ignora JSON inválido ou incompleto", () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = "{ não é json";
    expect(pushConfigurado()).toBe(false);
    limparCacheFcm();
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({ project_id: "x" });
    expect(pushConfigurado()).toBe(false);
  });
});

describe("montarJwtConta", () => {
  it("gera um JWT RS256 que a chave pública valida", () => {
    const jwt = montarJwtConta(CONTA, 1_800_000_000_000);
    const [cabecalho, corpo, assinatura] = jwt.split(".");
    expect(decodificar(cabecalho)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(decodificar(corpo)).toMatchObject({
      iss: CONTA.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: 1_800_000_000,
      exp: 1_800_003_600,
    });
    const valido = createVerify("RSA-SHA256")
      .update(`${cabecalho}.${corpo}`)
      .verify(createPublicKey(publicKey), Buffer.from(assinatura, "base64url"));
    expect(valido).toBe(true);
  });
});

function respostaJson(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("enviarPush", () => {
  it("não envia nada quando o Firebase não está configurado", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await enviarPush(TOKEN_APARELHO, { titulo: "a", corpo: "b" })).toBe("erro");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("troca o JWT por token de acesso e envia a mensagem", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify(CONTA);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respostaJson({ access_token: "acesso-1", expires_in: 3600 }))
      .mockResolvedValueOnce(respostaJson({ name: "projects/x/messages/1" }));
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await enviarPush(TOKEN_APARELHO, {
      titulo: "Nova entrega #7",
      corpo: "Ana",
      dados: { url: "/motorista/entregas/abc" },
    });
    expect(resultado).toBe("ok");

    const [urlToken, opcoesToken] = fetchMock.mock.calls[0];
    expect(urlToken).toBe("https://oauth2.googleapis.com/token");
    expect(String(opcoesToken.body)).toContain("grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer");

    const [urlEnvio, opcoesEnvio] = fetchMock.mock.calls[1];
    expect(urlEnvio).toBe(
      "https://fcm.googleapis.com/v1/projects/canhoto-teste/messages:send"
    );
    expect(opcoesEnvio.headers.Authorization).toBe("Bearer acesso-1");
    const corpo = JSON.parse(opcoesEnvio.body);
    expect(corpo.message).toMatchObject({
      token: TOKEN_APARELHO,
      notification: { title: "Nova entrega #7", body: "Ana" },
      data: { url: "/motorista/entregas/abc" },
      android: { priority: "HIGH", notification: { channel_id: "entregas" } },
    });
  });

  it("reaproveita o token de acesso entre envios", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify(CONTA);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respostaJson({ access_token: "acesso-1", expires_in: 3600 }))
      .mockResolvedValue(respostaJson({ name: "ok" }));
    vi.stubGlobal("fetch", fetchMock);

    await enviarPush(TOKEN_APARELHO, { titulo: "a", corpo: "b" });
    await enviarPush(TOKEN_APARELHO, { titulo: "c", corpo: "d" });

    const chamadasAoToken = fetchMock.mock.calls.filter(
      ([url]) => url === "https://oauth2.googleapis.com/token"
    );
    expect(chamadasAoToken).toHaveLength(1);
  });

  it("marca como inválido o aparelho que não existe mais (UNREGISTERED)", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify(CONTA);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(respostaJson({ access_token: "t", expires_in: 3600 }))
        .mockResolvedValueOnce(
          respostaJson(
            {
              error: {
                status: "NOT_FOUND",
                details: [{ errorCode: "UNREGISTERED" }],
              },
            },
            404
          )
        )
    );
    expect(await enviarPush(TOKEN_APARELHO, { titulo: "a", corpo: "b" })).toBe(
      "token-invalido"
    );
  });

  it("400 por mensagem mal montada não apaga o aparelho", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify(CONTA);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(respostaJson({ access_token: "t", expires_in: 3600 }))
        .mockResolvedValueOnce(
          respostaJson(
            { error: { status: "INVALID_ARGUMENT", message: "Invalid JSON payload" } },
            400
          )
        )
    );
    expect(await enviarPush(TOKEN_APARELHO, { titulo: "a", corpo: "b" })).toBe("erro");
  });

  it("falha de rede vira erro sem lançar exceção", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify(CONTA);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sem rede")));
    expect(await enviarPush(TOKEN_APARELHO, { titulo: "a", corpo: "b" })).toBe("erro");
  });
});

describe("mensagens", () => {
  it("entrega nova leva o motorista ao detalhe", () => {
    expect(
      mensagemEntregaNova({
        id: "abc",
        numero: 12,
        clienteNome: "Ana",
        endereco: "Rua A, 10",
      })
    ).toEqual({
      titulo: "Nova entrega #12",
      corpo: "Ana · Rua A, 10",
      dados: { tipo: "nova", url: "/motorista/entregas/abc" },
    });
  });

  it("entrega nova sem endereço mostra só o cliente", () => {
    expect(
      mensagemEntregaNova({ id: "x", numero: 1, clienteNome: "Ana", endereco: null }).corpo
    ).toBe("Ana");
  });

  it("diferencia cancelada de reatribuída", () => {
    const entrega = { numero: 5, clienteNome: "Bia" };
    expect(mensagemEntregaRetirada(entrega, "cancelada").titulo).toBe(
      "Entrega #5 cancelada"
    );
    expect(mensagemEntregaRetirada(entrega, "reatribuida").titulo).toBe(
      "Entrega #5 passou para outro motorista"
    );
  });
});
