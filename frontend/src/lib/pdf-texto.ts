import "server-only";

// Usa o pdfjs-dist (build "legacy", sem DOM) em vez do pacote pdf-parse:
// pdf-parse embute uma versão muito antiga do pdf.js (2017) que falha em
// PDFs gerados por ferramentas atuais (ex. PDFs feitos com pdfkit deram
// "bad XRef entry" nos testes, mesmo sendo válidos). A lógica em si fica em
// @/lib/pdf-texto-core, sem "server-only", pra poder ser testada com Vitest.
export { extrairTextoPdf } from "./pdf-texto-core";
