import { describe, expect, it } from "vitest";
import { extrairTextoPdf } from "./pdf-texto-core";

/**
 * Gera um PDF mínimo e válido (sem dependências), uma linha de texto por
 * posição vertical — o bastante pra exercitar extrairTextoPdf de ponta a
 * ponta sem precisar de um arquivo de PDF real no repositório.
 */
function pdfComLinhas(linhas: string[]): Uint8Array {
  const conteudo = linhas
    .map(
      (l, i) =>
        `BT /F1 10 Tf 40 ${780 - i * 14} Td (${l.replace(/[()\\]/g, (c) => "\\" + c)}) Tj ET`
    )
    .join("\n");
  const streamObj = `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595 842] /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    streamObj,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += String(off).padStart(10, "0") + " 00000 n \n";
  }
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf, "latin1"));
}

describe("extrairTextoPdf", () => {
  it("extrai o texto de um PDF com camada de texto, uma linha por posição", async () => {
    const bytes = pdfComLinhas([
      "CHAVE DE ACESSO",
      "2826 1012 3456 7800 0199 5500 1000 0045 1211 2345 6780",
      "VALOR TOTAL DA NOTA",
      "1.234,56",
    ]);
    const texto = await extrairTextoPdf(bytes);
    expect(texto).toBe(
      "CHAVE DE ACESSO\n2826 1012 3456 7800 0199 5500 1000 0045 1211 2345 6780\nVALOR TOTAL DA NOTA\n1.234,56"
    );
  });

  it("retorna string vazia (sem lançar) para PDF sem nenhum texto", async () => {
    const texto = await extrairTextoPdf(pdfComLinhas([]));
    expect(texto).toBe("");
  });
});
