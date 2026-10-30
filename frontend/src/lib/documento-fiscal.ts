import type { FormaPagamento } from "@/types/database";

/** Quantos documentos (XML/PDF) podem ser anexados ao cadastrar uma entrega. */
export const MAX_DOCUMENTOS_ENTREGA = 4;
export const MAX_BYTES_XML = 1024 * 1024;
export const MAX_BYTES_PDF = 4 * 1024 * 1024;

export type TipoDocumentoAnexo = "xml_nfe" | "xml_cte" | "danfe_pdf";

export function extensaoDocumento(nome: string): "xml" | "pdf" | null {
  const ext = nome.trim().toLowerCase().split(".").pop();
  if (ext === "xml") return "xml";
  if (ext === "pdf") return "pdf";
  return null;
}

function semBom(texto: string): string {
  return texto.replace(/^﻿/, "").trimStart();
}

/** Diz se o texto é um XML de NF-e, de CT-e ou nenhum dos dois. */
export function tipoDoXmlFiscal(texto: string): "xml_nfe" | "xml_cte" | null {
  const inicio = semBom(texto);
  if (!inicio.startsWith("<")) return null;
  if (/<infNFe[\s>]/.test(inicio)) return "xml_nfe";
  if (/<infCte[\s>]/i.test(inicio)) return "xml_cte";
  return null;
}

export function ehPdf(bytes: Uint8Array): boolean {
  return (
    bytes.length > 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

export interface DadosNfe {
  clienteNome?: string;
  clienteTelefone?: string;
  endereco?: string;
  cep?: string;
  numeroNfe?: string;
  numeroPedido?: string;
  /** Valor total da nota, em reais. */
  valor?: number;
  formaPagamento?: FormaPagamento;
}

function decodificar(valor: string): string {
  return valor
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) =>
      String.fromCodePoint(parseInt(h, 16))
    )
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function bloco(xml: string, tag: string): string | null {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(xml);
  return m ? m[1] : null;
}

function campo(xml: string | null, tag: string): string | undefined {
  if (!xml) return undefined;
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(xml);
  if (!m) return undefined;
  const valor = decodificar(m[1]);
  return valor || undefined;
}

const FORMA_POR_CODIGO: Record<string, FormaPagamento> = {
  "01": "dinheiro",
  "03": "cartao_1x",
  "04": "debito",
  "14": "prazo", // duplicata mercantil
  "15": "prazo", // boleto
  "17": "pix",
};

/**
 * Lê do XML da NF-e só o que ajuda a cadastrar a entrega (destinatário, nº da
 * nota, pedido, valor, forma de pagamento). Leitura por texto: não expande
 * entidades externas, então um XML malicioso não consegue ler arquivos.
 */
export function lerDadosNfe(texto: string): DadosNfe {
  const xml = semBom(texto);
  const dados: DadosNfe = {};

  const dest = bloco(xml, "dest");
  dados.clienteNome = campo(dest, "xNome");

  // Telefone sem DDD (8 ou 9 dígitos): usa o DDD do telefone da própria loja.
  const dddEmitente = campo(bloco(xml, "enderEmit"), "fone")
    ?.replace(/\D/g, "")
    .slice(0, 2);
  const fone = campo(dest, "fone")?.replace(/\D/g, "");
  if (fone) {
    let local = fone.length > 11 && fone.startsWith("55") ? fone.slice(2) : fone;
    if ((local.length === 8 || local.length === 9) && dddEmitente?.length === 2) {
      local = dddEmitente + local;
    }
    if (local.length === 10 || local.length === 11) dados.clienteTelefone = local;
  }

  const ender = bloco(dest ?? "", "enderDest");
  if (ender) {
    const partes = [
      campo(ender, "xLgr"),
      campo(ender, "nro"),
      campo(ender, "xCpl"),
      campo(ender, "xBairro"),
    ].filter((p): p is string => Boolean(p));
    if (partes.length > 0) dados.endereco = partes.join(", ");
    const cep = campo(ender, "CEP")?.replace(/\D/g, "");
    if (cep && cep.length === 8) dados.cep = cep;
  }

  dados.numeroNfe = campo(bloco(xml, "ide"), "nNF");
  // O pedido vem no item (xPed) ou, em muitos sistemas, só no texto livre
  // ("Pedido: 887352") das informações adicionais.
  dados.numeroPedido =
    campo(bloco(xml, "prod"), "xPed") ??
    /\bPedido:?\s*(\d{1,20})\b/i.exec(campo(bloco(xml, "infAdic"), "infCpl") ?? "")?.[1];

  const vNF = campo(bloco(xml, "ICMSTot"), "vNF");
  if (vNF) {
    const valor = Number(vNF);
    if (Number.isFinite(valor) && valor > 0) dados.valor = valor;
  }

  const tPag = campo(bloco(xml, "detPag"), "tPag");
  if (tPag && FORMA_POR_CODIGO[tPag]) dados.formaPagamento = FORMA_POR_CODIGO[tPag];

  return dados;
}

// --- Leitura a partir do texto do PDF (DANFE) ---------------------------
//
// O DANFE é só a representação visual da mesma NF-e: não tem tags, cada
// emissor pode diagramar um pouco diferente, e um PDF escaneado não tem
// nem texto pra ler. Por isso essa leitura é "melhor esforço" — bem menos
// confiável que lerDadosNfe (XML) — e só deve ser usada quando não há XML
// anexado. Dois pontos são sólidos mesmo assim: a chave de acesso (44
// dígitos com formato fixo, de onde vem o nº da nota) e o rótulo "VALOR
// TOTAL DA NOTA", que o layout padrão do DANFE sempre imprime.

function aposRotulo(
  texto: string,
  rotulo: RegExp,
  distancia = 150
): string | undefined {
  const m = rotulo.exec(texto);
  if (!m) return undefined;
  return texto.slice(m.index + m[0].length, m.index + m[0].length + distancia);
}

function campoAposRotulo(
  texto: string,
  rotulo: RegExp,
  pararEm: RegExp
): string | undefined {
  const resto = aposRotulo(texto, rotulo, 200);
  if (!resto) return undefined;
  const fim = pararEm.exec(resto);
  const trecho = fim ? resto.slice(0, fim.index) : resto;
  const linha = trecho
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return linha || undefined;
}

/** Nº da NF-e embutido na chave de acesso (posições 26–34, sem zeros à esquerda). */
function nNfDaChaveAcesso(chave44Digitos: string): string | undefined {
  const nNF = chave44Digitos.slice(25, 34).replace(/^0+/, "");
  return nNF || undefined;
}

function extrairChaveAcesso(texto: string): string | undefined {
  // A chave de 44 dígitos nem sempre fica logo após o rótulo "CHAVE DE
  // ACESSO" na ordem em que o pdf.js extrai o texto (varia por layout de
  // DANFE, e às vezes o bloco do protocolo de autorização entra no meio).
  // Em vez de depender da proximidade do rótulo, procura em todo o texto
  // por uma sequência de dígitos (com separadores . - / e espaço, como a
  // chave costuma vir impressa) que resulte em exatamente 44 dígitos —
  // comprimento praticamente exclusivo da chave de acesso num DANFE.
  const candidatos = texto.match(/\d[\d .\-/]{38,80}\d/g) ?? [];
  for (const candidato of candidatos) {
    const digitos = candidato.replace(/\D/g, "");
    if (digitos.length === 44) return digitos;
  }
  // Fallback: tenta a janela próxima ao rótulo, caso o texto não tenha
  // separadores entre os dígitos (ex. 44 dígitos corridos).
  const resto = aposRotulo(texto, /CHAVE\s+DE\s+ACESSO/i, 220);
  if (!resto) return undefined;
  const digitos = resto.replace(/\D/g, "");
  return digitos.length >= 44 ? digitos.slice(0, 44) : undefined;
}

function extrairValorTotalDanfe(texto: string): number | undefined {
  const resto = aposRotulo(texto, /VALOR\s+TOTAL\s+DA\s+NOTA(?:\s+FISCAL)?/i, 80);
  const m = resto && /(\d{1,3}(?:\.\d{3})*,\d{2})/.exec(resto);
  if (!m) return undefined;
  const valor = Number(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(valor) && valor > 0 ? valor : undefined;
}

function extrairCepDanfe(texto: string): string | undefined {
  const resto = aposRotulo(texto, /\bCEP\b/i, 60);
  const m = resto && /(\d{5})-?(\d{3})/.exec(resto);
  return m ? m[1] + m[2] : undefined;
}

function extrairTelefoneDanfe(texto: string): string | undefined {
  const resto = aposRotulo(texto, /FONE\s*\/?\s*FAX|\bFONE\b/i, 60);
  const m = resto && /\(?(\d{2})\)?[\s.-]?(\d{4,5})[\s.-]?(\d{4})\b/.exec(resto);
  if (!m) return undefined;
  const numero = m[1] + m[2] + m[3];
  return numero.length === 10 || numero.length === 11 ? numero : undefined;
}

/**
 * Lê do texto extraído do DANFE (PDF) os mesmos campos de lerDadosNfe,
 * usando os rótulos fixos do layout padrão de DANFE. Melhor esforço: ao
 * contrário do XML, não há garantia de que todos os campos sejam
 * encontrados ou de que estejam corretos — confira antes de salvar.
 */
export function lerDadosNfeDoTextoDanfe(texto: string): DadosNfe {
  const dados: DadosNfe = {};

  const chave = extrairChaveAcesso(texto);
  if (chave) {
    const numeroNfe = nNfDaChaveAcesso(chave);
    if (numeroNfe) dados.numeroNfe = numeroNfe;
  }

  const nome = campoAposRotulo(
    texto,
    /NOME\s*\/?\s*RAZ[ÃA]O\s+SOCIAL/i,
    /\bCNPJ\b|\bCPF\b|DATA\s+DA\s+EMISS/i
  );
  if (nome) dados.clienteNome = nome;

  const endereco = campoAposRotulo(
    texto,
    /ENDERE[ÇC]O/i,
    /BAIRRO|DISTRITO|\bCEP\b|DATA\s+DA\s+SA[IÍ]DA/i
  );
  if (endereco) dados.endereco = endereco;

  const cep = extrairCepDanfe(texto);
  if (cep) dados.cep = cep;

  const telefone = extrairTelefoneDanfe(texto);
  if (telefone) dados.clienteTelefone = telefone;

  const pedido = /\bPedido:?\s*(\d{1,20})\b/i.exec(texto)?.[1];
  if (pedido) dados.numeroPedido = pedido;

  const valor = extrairValorTotalDanfe(texto);
  if (valor) dados.valor = valor;

  return dados;
}
