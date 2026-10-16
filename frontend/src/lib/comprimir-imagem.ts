// Compressão de foto no próprio celular, antes do envio. Foto de câmera
// moderna passa de 5 MB; com 4G ruim isso demora e falha. Reduzir para
// ~1600 px no maior lado (JPEG qualidade ~0,8) deixa o arquivo em poucas
// centenas de KB e ainda legível como comprovante.
//
// Regra de ouro: NUNCA bloquear a entrega por causa da compressão. Qualquer
// falha (formato que o navegador não decodifica, como HEIC em alguns
// aparelhos, canvas indisponível, resultado maior que o original) devolve o
// arquivo original.

export interface OpcoesCompressao {
  ladoMaximo?: number;
  qualidade?: number;
  // Abaixo disso o arquivo já é pequeno o bastante e não vale reprocessar.
  tamanhoMinimoBytes?: number;
}

export function calcularDimensoes(
  largura: number,
  altura: number,
  ladoMaximo: number
): { largura: number; altura: number } {
  const maior = Math.max(largura, altura);
  if (maior <= ladoMaximo || maior <= 0) {
    return { largura, altura };
  }
  const escala = ladoMaximo / maior;
  return {
    largura: Math.max(1, Math.round(largura * escala)),
    altura: Math.max(1, Math.round(altura * escala)),
  };
}

export function nomeComExtensaoJpg(nome: string): string {
  const base = nome.replace(/\.[^./\\]+$/, "");
  return `${base || "foto"}.jpg`;
}

async function decodificar(
  arquivo: File
): Promise<{ fonte: CanvasImageSource; largura: number; altura: number; liberar: () => void }> {
  if (typeof createImageBitmap === "function") {
    // "from-image" aplica a rotação EXIF (foto tirada em pé não fica deitada).
    const bitmap = await createImageBitmap(arquivo, {
      imageOrientation: "from-image",
    });
    return {
      fonte: bitmap,
      largura: bitmap.width,
      altura: bitmap.height,
      liberar: () => bitmap.close(),
    };
  }

  const url = URL.createObjectURL(arquivo);
  try {
    const imagem = new Image();
    imagem.decoding = "async";
    imagem.src = url;
    await imagem.decode();
    return {
      fonte: imagem,
      largura: imagem.naturalWidth,
      altura: imagem.naturalHeight,
      liberar: () => URL.revokeObjectURL(url),
    };
  } catch (erro) {
    URL.revokeObjectURL(url);
    throw erro;
  }
}

export async function comprimirImagem(
  arquivo: File,
  opcoes: OpcoesCompressao = {}
): Promise<File> {
  const {
    ladoMaximo = 1600,
    qualidade = 0.8,
    tamanhoMinimoBytes = 300 * 1024,
  } = opcoes;

  if (typeof document === "undefined") return arquivo;
  if (!arquivo.type.startsWith("image/")) return arquivo;
  if (arquivo.size <= tamanhoMinimoBytes) return arquivo;

  try {
    const imagem = await decodificar(arquivo);
    try {
      const { largura, altura } = calcularDimensoes(
        imagem.largura,
        imagem.altura,
        ladoMaximo
      );
      const canvas = document.createElement("canvas");
      canvas.width = largura;
      canvas.height = altura;
      const contexto = canvas.getContext("2d");
      if (!contexto) return arquivo;

      // Fundo branco: PNG com transparência (print do Pix) não vira preto
      // ao virar JPEG.
      contexto.fillStyle = "#ffffff";
      contexto.fillRect(0, 0, largura, altura);
      contexto.drawImage(imagem.fonte, 0, 0, largura, altura);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", qualidade)
      );
      if (!blob || blob.size === 0 || blob.size >= arquivo.size) return arquivo;

      return new File([blob], nomeComExtensaoJpg(arquivo.name), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    } finally {
      imagem.liberar();
    }
  } catch {
    return arquivo;
  }
}
