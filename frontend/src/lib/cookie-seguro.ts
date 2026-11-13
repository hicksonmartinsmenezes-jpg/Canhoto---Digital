import { headers } from "next/headers";

/**
 * O cookie só recebe "Secure" quando o acesso chegou por HTTPS (o Caddy
 * informa isso em X-Forwarded-Proto). Assim o painel no domínio público
 * fica protegido, e o acesso por HTTP na rede da loja continua funcionando.
 */
export function protocoloEhHttps(valor: string | null | undefined): boolean {
  return valor?.split(",")[0]?.trim().toLowerCase() === "https";
}

export async function cookieDeveSerSeguro(): Promise<boolean> {
  const cabecalhos = await headers();
  return protocoloEhHttps(cabecalhos.get("x-forwarded-proto"));
}
