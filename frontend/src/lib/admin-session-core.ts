export const ADMIN_COOKIE_NAME = "admin_sessao";
export const ADMIN_SESSAO_DURACAO_MS = 8 * 60 * 60 * 1000;

function textoParaBytes(texto: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(texto);
}

function bytesParaBase64Url(bytes: Uint8Array<ArrayBuffer>): string {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
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
    for (let i = 0; i < binario.length; i++) {
      bytes[i] = binario.charCodeAt(i);
    }
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
  const assinatura = await crypto.subtle.sign(
    "HMAC",
    chave,
    textoParaBytes(payload)
  );
  return new Uint8Array(assinatura);
}

export async function criarTokenSessaoAdmin(
  usuarioAdminId: string,
  segredo: string,
  agora: number
): Promise<string> {
  const expiraEm = agora + ADMIN_SESSAO_DURACAO_MS;
  const payload = `${usuarioAdminId}.${expiraEm}`;
  const assinatura = await assinar(payload, segredo);
  return `${payload}.${bytesParaBase64Url(assinatura)}`;
}

export async function verificarTokenSessaoAdmin(
  token: string,
  segredo: string,
  agora: number
): Promise<string | null> {
  const partes = token.split(".");
  if (partes.length !== 3) return null;

  const [usuarioAdminId, expiraEmTexto, assinaturaTexto] = partes;
  const expiraEm = Number(expiraEmTexto);
  if (!usuarioAdminId || !Number.isFinite(expiraEm) || expiraEm < agora) {
    return null;
  }

  const assinatura = base64UrlParaBytes(assinaturaTexto);
  if (!assinatura) return null;

  const payload = `${usuarioAdminId}.${expiraEmTexto}`;
  const chave = await importarChave(segredo, ["verify"]);
  const valido = await crypto.subtle.verify(
    "HMAC",
    chave,
    assinatura,
    textoParaBytes(payload)
  );

  return valido ? usuarioAdminId : null;
}
