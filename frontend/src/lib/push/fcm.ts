// Cliente mínimo do Firebase Cloud Messaging (HTTP v1), sem dependências:
// assina o JWT da conta de serviço com node:crypto e troca por um token de acesso.
//
// Configuração (variáveis de ambiente do servidor da loja), uma das duas:
//   FIREBASE_SERVICE_ACCOUNT_FILE  caminho do .json da conta de serviço
//   FIREBASE_SERVICE_ACCOUNT_JSON  o conteúdo do .json em uma linha
// Sem nenhuma das duas o push fica desligado (nada quebra; só não envia).

import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

export interface ContaServicoFirebase {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export interface MensagemPush {
  titulo: string;
  corpo: string;
  /** Dados entregues ao app (valores sempre texto, exigência do FCM). */
  dados?: Record<string, string>;
}

export type ResultadoEnvio = "ok" | "token-invalido" | "erro";

const CANAL_ANDROID_ENTREGAS = "entregas";

let contaEmCache: ContaServicoFirebase | null | undefined;
let acessoEmCache: { token: string; expiraEm: number } | null = null;

/** Só para testes. */
export function limparCacheFcm() {
  contaEmCache = undefined;
  acessoEmCache = null;
}

function validarConta(bruto: unknown): ContaServicoFirebase | null {
  if (!bruto || typeof bruto !== "object") return null;
  const c = bruto as Record<string, unknown>;
  if (
    typeof c.project_id !== "string" ||
    typeof c.client_email !== "string" ||
    typeof c.private_key !== "string"
  ) {
    return null;
  }
  return {
    project_id: c.project_id,
    client_email: c.client_email,
    private_key: c.private_key,
    token_uri:
      typeof c.token_uri === "string" && c.token_uri.startsWith("https://")
        ? c.token_uri
        : undefined,
  };
}

export function obterContaServico(): ContaServicoFirebase | null {
  if (contaEmCache !== undefined) return contaEmCache;

  let conta: ContaServicoFirebase | null = null;
  try {
    const arquivo = process.env.FIREBASE_SERVICE_ACCOUNT_FILE?.trim();
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    const texto = arquivo ? readFileSync(arquivo, "utf8") : json;
    conta = texto ? validarConta(JSON.parse(texto)) : null;
  } catch {
    conta = null;
  }

  contaEmCache = conta;
  return conta;
}

export function pushConfigurado(): boolean {
  return obterContaServico() !== null;
}

function base64Url(dados: Buffer | string): string {
  return Buffer.from(dados)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function montarJwtConta(conta: ContaServicoFirebase, agoraMs: number): string {
  const emitido = Math.floor(agoraMs / 1000);
  const cabecalho = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const corpo = base64Url(
    JSON.stringify({
      iss: conta.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: conta.token_uri ?? "https://oauth2.googleapis.com/token",
      iat: emitido,
      exp: emitido + 3600,
    })
  );
  const assinatura = createSign("RSA-SHA256")
    .update(`${cabecalho}.${corpo}`)
    .sign(conta.private_key);
  return `${cabecalho}.${corpo}.${base64Url(assinatura)}`;
}

async function obterTokenAcesso(conta: ContaServicoFirebase): Promise<string | null> {
  const agora = Date.now();
  if (acessoEmCache && acessoEmCache.expiraEm - 60_000 > agora) {
    return acessoEmCache.token;
  }

  try {
    const resposta = await fetch(conta.token_uri ?? "https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: montarJwtConta(conta, agora),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resposta.ok) return null;
    const dados = (await resposta.json()) as {
      access_token?: unknown;
      expires_in?: unknown;
    };
    if (typeof dados.access_token !== "string") return null;
    const duracao = typeof dados.expires_in === "number" ? dados.expires_in : 3600;
    acessoEmCache = {
      token: dados.access_token,
      expiraEm: agora + duracao * 1000,
    };
    return acessoEmCache.token;
  } catch {
    return null;
  }
}

export interface EnvioDetalhado {
  resultado: ResultadoEnvio;
  /** Texto curto para diagnóstico (não contém token nem chave). */
  detalhe?: string;
}

export async function enviarPushComDetalhe(
  tokenDoAparelho: string,
  mensagem: MensagemPush
): Promise<EnvioDetalhado> {
  const conta = obterContaServico();
  if (!conta) {
    return { resultado: "erro", detalhe: "Firebase não configurado no servidor." };
  }

  const acesso = await obterTokenAcesso(conta);
  if (!acesso) {
    return {
      resultado: "erro",
      detalhe: "O Google recusou a chave da conta de serviço (ou o servidor está sem internet).",
    };
  }

  try {
    const resposta = await fetch(
      `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(conta.project_id)}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${acesso}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: tokenDoAparelho,
            notification: { title: mensagem.titulo, body: mensagem.corpo },
            data: mensagem.dados ?? {},
            android: {
              priority: "HIGH",
              notification: {
                channel_id: CANAL_ANDROID_ENTREGAS,
                sound: "default",
              },
            },
          },
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (resposta.ok) return { resultado: "ok" };

    const texto = await resposta.text().catch(() => "");
    let erro: {
      error?: {
        status?: string;
        message?: string;
        details?: Array<{ errorCode?: string }>;
      };
    } | null = null;
    try {
      erro = JSON.parse(texto);
    } catch {
      erro = null;
    }
    const codigo = erro?.error?.details?.find((d) => d.errorCode)?.errorCode;
    const detalhe = `FCM ${resposta.status} ${erro?.error?.status ?? ""} ${codigo ?? ""} ${(erro?.error?.message ?? "").slice(0, 160)}`.replace(/\s+/g, " ").trim();
    console.error("[push] FCM recusou o envio:", detalhe);

    // Celular desinstalou o app / token expirou: não adianta tentar de novo.
    // 400 também acontece por mensagem mal montada; só descarta o aparelho
    // quando o erro é claramente sobre o token dele.
    if (
      codigo === "UNREGISTERED" ||
      erro?.error?.status === "NOT_FOUND" ||
      (erro?.error?.status === "INVALID_ARGUMENT" &&
        /registration token/i.test(erro.error.message ?? ""))
    ) {
      return { resultado: "token-invalido", detalhe };
    }
    if (resposta.status === 401) acessoEmCache = null;
    return { resultado: "erro", detalhe };
  } catch (erro) {
    const detalhe = `Falha de rede ao falar com o Firebase: ${erro instanceof Error ? erro.message : "desconhecida"}`;
    console.error("[push]", detalhe);
    return { resultado: "erro", detalhe };
  }
}

export async function enviarPush(
  tokenDoAparelho: string,
  mensagem: MensagemPush
): Promise<ResultadoEnvio> {
  return (await enviarPushComDetalhe(tokenDoAparelho, mensagem)).resultado;
}
