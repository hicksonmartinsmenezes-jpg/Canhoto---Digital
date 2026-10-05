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

type LeitorDeCabecalhos = { get(nome: string): string | null };

function normalizarHost(valor: string): string {
  return valor.trim().split(":")[0].toLowerCase();
}

/**
 * Decide se a requisição chegou pelo caminho público (túnel Cloudflare).
 *
 * Importante: `X-Forwarded-Host` pode ser enviado pelo próprio cliente, então
 * ele nunca pode "esconder" um host público — qualquer valor público em
 * qualquer um dos cabeçalhos (Host, X-Forwarded-Host, todos os valores da
 * lista) já marca a requisição como pública (lógica OR, falha para o lado
 * seguro). Cabeçalhos injetados pelo Cloudflare (`cf-connecting-ip`,
 * `cf-ray`) também contam: cobrem hostname próprio cujo túnel reescreve o
 * Host para localhost. Quem acessa a rede local não tem esses cabeçalhos; se
 * alguém forjá-los na LAN, só perde o acesso ao Portal (nunca ganha).
 */
export function requisicaoEhPublicaMotorista(
  cabecalhos: LeitorDeCabecalhos,
  hostConfigurado?: string
): boolean {
  const candidatos = [
    ...(cabecalhos.get("x-forwarded-host") ?? "").split(","),
    ...(cabecalhos.get("host") ?? "").split(","),
  ]
    .map(normalizarHost)
    .filter(Boolean);

  if (candidatos.some((h) => hostEhPublicoMotorista(h, hostConfigurado))) {
    return true;
  }

  return Boolean(cabecalhos.get("cf-connecting-ip") || cabecalhos.get("cf-ray"));
}
