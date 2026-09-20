export function hostEhPublicoMotorista(
  hostname: string,
  hostConfigurado?: string
): boolean {
  const host = hostname.trim().toLowerCase();
  const configurado = hostConfigurado?.trim().toLowerCase();

  if (configurado && host === configurado) {
    return true;
  }

  return host.endsWith(".trycloudflare.com");
}
