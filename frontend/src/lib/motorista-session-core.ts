// Lógica pura de assinatura/verificação do token de sessão do app do
// motorista — sem "server-only" nem "next/headers" de propósito, pra dar
// pra reusar tanto em Server Actions/Server Components (via
// @/lib/motorista-session) quanto no middleware (@/middleware), que roda
// no Edge runtime e não tem acesso à API `next/headers`/Node `crypto`.
//
// Por isso usa só Web Crypto (`crypto.subtle`) + `btoa`/`atob`, disponíveis
// tanto no Node quanto no Edge runtime — ver @/lib/motorista-auth para o
// hash do PIN em si, que roda só em Server Actions (Node) e pode usar
// `node:crypto` sem essa restrição.
//
// Formato do token: "<motoboyId>.<expiraEmMs>.<assinaturaBase64Url>",
// onde a assinatura é HMAC-SHA256 de "<motoboyId>.<expiraEmMs>" com o
// segredo `MOTORISTA_SESSION_SECRET`.

export const MOTORISTA_COOKIE_NAME = "motorista_sessao";
export const MOTORISTA_SESSAO_DURACAO_MS = 12 * 60 * 60 * 1000; // 12h

// Anotado explicitamente como `Uint8Array<ArrayBuffer>` (não só `Uint8Array`)
// — a partir do TypeScript 5.7/lib.dom mais recente, `Uint8Array` sem o
// parâmetro genérico vira um alias mais amplo (`Uint8Array<ArrayBufferLike>`,
// que inclui `SharedArrayBuffer`) e deixa de bater com o tipo `BufferSource`
// que `crypto.subtle.importKey/sign/verify` exigem. Sem essa anotação em
// cada função abaixo, o build falha no typecheck mesmo o código rodando
// certinho (visto na PR #32 — build/typecheck falharam por isso).
function textoParaBytes(texto: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(texto);
}

function bytesParaBase64Url(bytes: Uint8Array<ArrayBuffer>): string {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlParaBytes(valor: string): Uint8Array<ArrayBuffer> | null {
  try {
    const normalizado = valor.replace(/-/g, "+").replace(/_/g, "/");
    const comPadding = normalizado.padEnd(
      normalizado.length + ((4 - (normalizado.length % 4)) % 4),
      "="
    );
    const binario = atob(comPadding);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function importarChave(
  segredo: string,
  uso: KeyUsage[]
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    textoParaBytes(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    uso
  );
}

async function assinar(
  payload: string,
  segredo: string
): Promise<Uint8Array<ArrayBuffer>> {
  const chave = await importarChave(segredo, ["sign"]);
  const assinatura = await crypto.subtle.sign("HMAC", chave, textoParaBytes(payload));
  return new Uint8Array(assinatura);
}

async function conferirAssinatura(
  payload: string,
  assinatura: Uint8Array<ArrayBuffer>,
  segredo: string
): Promise<boolean> {
  const chave = await importarChave(segredo, ["verify"]);
  return crypto.subtle.verify("HMAC", chave, assinatura, textoParaBytes(payload));
}

export async function criarTokenSessao(
  motoboyId: string,
  segredo: string,
  agora: number
): Promise<string> {
  const expiraEm = agora + MOTORISTA_SESSAO_DURACAO_MS;
  const payload = `${motoboyId}.${expiraEm}`;
  const assinatura = await assinar(payload, segredo);
  return `${payload}.${bytesParaBase64Url(assinatura)}`;
}

// Devolve o `motoboyId` se o token for válido (assinatura confere e ainda
// não expirou), ou `null` caso contrário — nunca lança erro, pra dar pra
// usar direto num `if` tanto na Server Action quanto no middleware.
export async function verificarTokenSessao(
  token: string,
  segredo: string,
  agora: number
): Promise<string | null> {
  const partes = token.split(".");
  if (partes.length !== 3) return null;

  const [motoboyId, expiraEmTexto, assinaturaTexto] = partes;
  const expiraEm = Number(expiraEmTexto);
  if (!motoboyId || !Number.isFinite(expiraEm) || expiraEm < agora) return null;

  const assinatura = base64UrlParaBytes(assinaturaTexto);
  if (!assinatura) return null;

  const payload = `${motoboyId}.${expiraEmTexto}`;
  const valido = await conferirAssinatura(payload, assinatura, segredo);
  return valido ? motoboyId : null;
}
