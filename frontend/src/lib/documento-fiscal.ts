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
