// Conversa com o app Android (Capacitor) quando a página roda dentro dele.
// Fora do app (navegador, PWA) tudo aqui é ignorado sem erro.
// Só código de navegador — não importar em Server Components.

interface PreferencesNativo {
  set(opcoes: { key: string; value: string }): Promise<void>;
}

interface CapacitorNativo {
  isNativePlatform?: () => boolean;
  Plugins?: { Preferences?: PreferencesNativo };
}

declare global {
  interface Window {
    Capacitor?: CapacitorNativo;
  }
}

/** Endereço da tela inicial do app Android (procura o servidor da loja). */
const LAUNCHER_DO_APP = "https://localhost/";

/** Mesma chave que a tela inicial (capacitor-www/index.html) lê. */
const CHAVE_OFFLINE_PRONTO = "motorista_offline_pronto";

/**
 * Arquivo público com o endereço atual do servidor da loja (o mesmo que a tela
 * inicial do app consulta). Quando o Quick Tunnel muda, é ele que é atualizado.
 */
const CONFIG_CENTRAL_URL =
  "https://raw.githubusercontent.com/hicksonmartinsmenezes-jpg/Canhoto---Digital/main/motorista-config.json";

const ENDERECO_PERMITIDO = /^https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com$/;

export function estaNoAppNativo(): boolean {
  return (
    typeof window !== "undefined" &&
    window.Capacitor?.isNativePlatform?.() === true
  );
}

/**
 * Avisa a tela inicial do app que esta cópia já funciona sem internet: a partir
 * daí ela pode abrir o app salvo sozinha quando o servidor não responder.
 */
export async function marcarOfflinePronto(): Promise<void> {
  if (!estaNoAppNativo()) return;

  try {
    await window.Capacitor?.Plugins?.Preferences?.set({
      key: CHAVE_OFFLINE_PRONTO,
      value: window.location.origin,
    });
  } catch {
    // Sem como avisar: a tela inicial só deixará de abrir o app salvo sozinha.
  }
}

/** Volta para a tela inicial do app e refaz a busca do servidor. */
export function voltarParaTelaInicialDoApp(): void {
  window.location.assign(`${LAUNCHER_DO_APP}?reconectar=1`);
}

/** Endereço atual do servidor segundo o arquivo da loja, ou null se não deu. */
export async function buscarEnderecoAtualDoServidor(): Promise<string | null> {
  const controle = new AbortController();
  const timer = window.setTimeout(() => controle.abort(), 6_000);

  try {
    const resposta = await fetch(`${CONFIG_CENTRAL_URL}?t=${Date.now()}`, {
      cache: "no-store",
      signal: controle.signal,
    });
    if (!resposta.ok) return null;

    const dados = (await resposta.json()) as { url?: unknown };
    if (typeof dados.url !== "string") return null;

    const url = new URL(dados.url.trim());
    const endereco = `${url.protocol}//${url.hostname.toLowerCase()}`;
    if (url.port || url.username || url.password) return null;
    return ENDERECO_PERMITIDO.test(endereco) ? endereco : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
