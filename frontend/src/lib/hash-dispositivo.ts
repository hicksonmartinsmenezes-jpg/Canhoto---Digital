// Impressão digital (SHA-256) calculada no celular, no momento em que a foto é
// guardada. O servidor recalcula ao receber e compara: se forem diferentes, o
// arquivo mudou no caminho. Só código de navegador.

/** SHA-256 em hexadecimal, ou null se o aparelho não suportar (ex.: HTTP). */
export async function sha256DoBlob(blob: Blob): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return null;
    const resumo = await subtle.digest("SHA-256", await blob.arrayBuffer());
    return Array.from(new Uint8Array(resumo), (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");
  } catch {
    return null;
  }
}

export interface HashesComprovante {
  fotoEntrega: string | null;
  comprovantePix: string | null;
  fotosProduto: Array<string | null>;
}

export async function calcularHashesComprovante(arquivos: {
  fotoEntrega: Blob;
  comprovantePix?: Blob | null;
  fotosProduto?: Blob[];
}): Promise<HashesComprovante> {
  return {
    fotoEntrega: await sha256DoBlob(arquivos.fotoEntrega),
    comprovantePix: arquivos.comprovantePix
      ? await sha256DoBlob(arquivos.comprovantePix)
      : null,
    fotosProduto: await Promise.all(
      (arquivos.fotosProduto ?? []).map((foto) => sha256DoBlob(foto))
    ),
  };
}

/** Acrescenta os hashes ao FormData, na mesma ordem dos arquivos. */
export function anexarHashes(
  formData: FormData,
  hashes: HashesComprovante | undefined
): void {
  if (!hashes) return;
  if (hashes.fotoEntrega) formData.set("hashFotoEntrega", hashes.fotoEntrega);
  if (hashes.comprovantePix) {
    formData.set("hashComprovantePix", hashes.comprovantePix);
  }
  for (const hash of hashes.fotosProduto) {
    // Vazio mantém a posição para a foto seguinte.
    formData.append("hashFotoProduto", hash ?? "");
  }
}
