import "server-only";

import path from "node:path";

const MIME_POR_EXTENSAO: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
};

export function diretorioRaizUploads(): string {
  const configurado = process.env.CANHOTO_UPLOAD_DIR?.trim();
  if (configurado) return path.resolve(configurado);

  return path.resolve(process.cwd(), "..", "storage", "uploads");
}

const NOMES_RESERVADOS_WINDOWS = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  "com1",
  "com2",
  "com3",
  "com4",
  "com5",
  "com6",
  "com7",
  "com8",
  "com9",
  "lpt1",
  "lpt2",
  "lpt3",
  "lpt4",
  "lpt5",
  "lpt6",
  "lpt7",
  "lpt8",
  "lpt9",
]);

export function nomeSeguroParaPasta(valor: string): string {
  const normalizado = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  if (!normalizado) return "cliente-sem-nome";
  if (NOMES_RESERVADOS_WINDOWS.has(normalizado)) {
    return `cliente-${normalizado}`;
  }

  return normalizado;
}

export function diretorioRelativoEntrega(
  clienteNome: string,
  numeroEntrega: number
): string {
  const cliente = nomeSeguroParaPasta(clienteNome);
  const numero = String(numeroEntrega).padStart(6, "0");
  return path.posix.join("entregas", cliente, `entrega-${numero}`);
}

export function resolverArquivoComprovante(
  arquivoRelativo: string
): { caminho: string; mime: string } | null {
  if (!arquivoRelativo || arquivoRelativo.includes("\0")) return null;

  const raiz = path.resolve(/* turbopackIgnore: true */ diretorioRaizUploads());
  const caminho = path.resolve(raiz, arquivoRelativo);
  const relativoNormalizado = path.relative(raiz, caminho);

  if (
    relativoNormalizado.startsWith("..") ||
    path.isAbsolute(relativoNormalizado)
  ) {
    return null;
  }

  const mime = MIME_POR_EXTENSAO[path.extname(caminho).toLowerCase()];
  if (!mime) return null;

  return { caminho, mime };
}
