// Ponte com o plugin de notificações do app Android (Capacitor Push
// Notifications). Fora do app tudo aqui é ignorado sem erro.
// Só código de navegador — não importar em Server Components.

export type PermissaoPush = "prompt" | "prompt-with-rationale" | "granted" | "denied";

export interface AcaoDeNotificacao {
  notification?: { data?: Record<string, unknown> };
}

interface OuvinteRemovivel {
  remove(): Promise<void>;
}

export interface PushNativo {
  checkPermissions(): Promise<{ receive: PermissaoPush }>;
  requestPermissions(): Promise<{ receive: PermissaoPush }>;
  register(): Promise<void>;
  createChannel?(canal: {
    id: string;
    name: string;
    description?: string;
    importance: 1 | 2 | 3 | 4 | 5;
    visibility?: -1 | 0 | 1;
    vibration?: boolean;
    sound?: string;
  }): Promise<void>;
  addListener(
    evento: "registration",
    ouvinte: (token: { value: string }) => void
  ): Promise<OuvinteRemovivel>;
  addListener(
    evento: "registrationError",
    ouvinte: (erro: unknown) => void
  ): Promise<OuvinteRemovivel>;
  addListener(
    evento: "pushNotificationReceived",
    ouvinte: (notificacao: unknown) => void
  ): Promise<OuvinteRemovivel>;
  addListener(
    evento: "pushNotificationActionPerformed",
    ouvinte: (acao: AcaoDeNotificacao) => void
  ): Promise<OuvinteRemovivel>;
}

/** Plugin de push do app, ou null se não estiver no app / sem o plugin (APK antigo). */
export function obterPushNativo(): PushNativo | null {
  if (typeof window === "undefined") return null;
  const capacitor = window.Capacitor as unknown as
    | { isNativePlatform?: () => boolean; Plugins?: Record<string, unknown> }
    | undefined;
  if (capacitor?.isNativePlatform?.() !== true) return null;
  const plugin = capacitor.Plugins?.PushNotifications as PushNativo | undefined;
  return plugin ?? null;
}

const CAMINHO_PERMITIDO = /^\/motorista(?:\/[A-Za-z0-9_-]+)*$/;

/** Caminho do app para onde a notificação leva, só se for seguro (dentro de /motorista). */
export function caminhoDaNotificacao(acao: AcaoDeNotificacao): string | null {
  const url = acao.notification?.data?.url;
  return typeof url === "string" && CAMINHO_PERMITIDO.test(url) ? url : null;
}

/**
 * Remove um ouvinte registrado no plugin. Dependendo de como a ponte do app
 * monta o plugin, addListener devolve uma Promise ou o próprio ouvinte; aceita
 * os dois e nunca lança erro (é chamado ao sair da tela).
 */
export function removerOuvinte(ouvinte: unknown): void {
  void Promise.resolve(ouvinte)
    .then((o) => {
      const remover = (o as { remove?: () => unknown } | null | undefined)?.remove;
      return typeof remover === "function" ? remover.call(o) : undefined;
    })
    .catch(() => {});
}
