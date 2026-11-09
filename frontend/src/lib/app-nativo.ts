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

/** Mesma chave que a tela inicial (capacitor-www/index.html) lê. */
const CHAVE_OFFLINE_PRONTO = "motorista_offline_pronto";

function estaNoAppNativo(): boolean {
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
