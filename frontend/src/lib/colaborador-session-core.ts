// Sessão do colaborador logado com papel "gestor_setor" — acesso quase
// igual ao Admin, mas escopado ao setor dele (ver @/lib/sessao-operador).
// Mesmo formato de token HMAC-SHA256 assinado que admin-session-core.ts e
// motorista-session-core.ts, pra funcionar tanto em Server
// Components/Actions (next/headers) quanto no proxy.ts (Web Crypto puro,
// sem node:crypto).

export const COLABORADOR_COOKIE_NAME = "colaborador_sessao";
export const COLABORADOR_SESSAO_DURACAO_MS = 8 * 60 * 60 * 1000;

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

// Payload carrega colaboradorId e setorId (pode ser null — colaborador sem
// setor definido não vê nada escopado) junto na assinatura, pra não
// precisar de outra consulta ao banco em toda request só pra saber o
// setor de quem está logado.
export async function criarTokenSessaoColaborador(
  colaboradorId: string,
  setorId: string | null,
  segredo: string,
  agora: number
): Promise<string> {
  const expiraEm = agora + COLABORADOR_SESSAO_DURACAO_MS;
  const payload = `${colaboradorId}.${setorId ?? ""}.${expiraEm}`;
  const assinatura = await assinar(payload, segredo);
  return `${payload}.${bytesParaBase64Url(assinatura)}`;
}

export interface SessaoColaboradorVerificada {
  colaboradorId: string;
  setorId: string | null;
}

export async function verificarTokenSessaoColaborador(
  token: string,
  segredo: string,
  agora: number
): Promise<SessaoColaboradorVerificada | null> {
  const partes = token.split(".");
  if (partes.length !== 4) return null;

  const [colaboradorId, setorIdTexto, expiraEmTexto, assinaturaTexto] =
    partes;
  const expiraEm = Number(expiraEmTexto);
  if (!colaboradorId || !Number.isFinite(expiraEm) || expiraEm < agora) {
    return null;
  }

  const assinatura = base64UrlParaBytes(assinaturaTexto);
  if (!assinatura) return null;

  const payload = `${colaboradorId}.${setorIdTexto}.${expiraEmTexto}`;
  const chave = await importarChave(segredo, ["verify"]);
  const valido = await crypto.subtle.verify(
    "HMAC",
    chave,
    assinatura,
    textoParaBytes(payload)
  );

  if (!valido) return null;

  return {
    colaboradorId,
    setorId: setorIdTexto ? setorIdTexto : null,
  };
}
