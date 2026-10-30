// Núcleo puro da extração de texto de PDF (sem "server-only"), pra poder ser
// testado isoladamente com Vitest. O wrapper que marca isso como código de
// servidor fica em @/lib/pdf-texto — ver esse arquivo para o porquê de usar
// pdfjs-dist em vez do pacote pdf-parse.

/**
 * Extrai o texto de um PDF (DANFE) para leitura por regras simples em
 * @/lib/documento-fiscal (lerDadosNfeDoTextoDanfe). Só funciona para PDFs
 * gerados digitalmente, com camada de texto — um PDF escaneado como imagem
 * não tem texto pra extrair (retorna string vazia).
 *
 * Reconstrói as linhas do texto pela posição vertical de cada item (pdf.js
 * só devolve os itens soltos, sem quebra de linha), já que a leitura por
 * rótulo em lerDadosNfeDoTextoDanfe depende de "rótulo" e "valor" ficarem em
 * linhas separadas, como o layout padrão do DANFE imprime.
 */
export async function extrairTextoPdf(bytes: Uint8Array): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const tarefa = pdfjsLib.getDocument({ data: bytes, useSystemFonts: true });
  const doc = await tarefa.promise;

  try {
    const linhas: string[] = [];
    for (let numeroPagina = 1; numeroPagina <= doc.numPages; numeroPagina++) {
      const pagina = await doc.getPage(numeroPagina);
      const conteudo = await pagina.getTextContent();
      let linhaAtual: string[] = [];
      let ultimoY: number | null = null;
      for (const item of conteudo.items) {
        if (!("str" in item)) continue;
        const y = item.transform[5];
        if (ultimoY !== null && Math.abs(y - ultimoY) > 2) {
          linhas.push(linhaAtual.join(" "));
          linhaAtual = [];
        }
        linhaAtual.push(item.str);
        ultimoY = y;
      }
      if (linhaAtual.length > 0) linhas.push(linhaAtual.join(" "));
    }
    return linhas.join("\n");
  } finally {
    await tarefa.destroy();
  }
}
