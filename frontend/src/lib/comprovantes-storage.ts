import "server-only";

import path from "node:path";

const MIME_POR_EXTENSAO: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

export function diretorioRaizUploads(): string {
  const configurado = process.env.CANHOTO_UPLOAD_DIR?.trim();
  if (configurado) return path.resolve(configurado);

  return path.resolve(process.cwd(), "..", "storage", "uploads");
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
