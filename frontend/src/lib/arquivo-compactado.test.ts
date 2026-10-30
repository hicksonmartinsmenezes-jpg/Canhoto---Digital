import { describe, expect, it } from "vitest";
import {
  PacoteErro,
  bytesDeBase64,
  extrairDocumentosDoZip,
  formatoCompactado,
  selecionarDocumentos,
  type ItemDoPacote,
} from "@/lib/arquivo-compactado";

const XML_NFE =
  '<?xml version="1.0" encoding="UTF-8"?><nfeProc><NFe><infNFe Id="NFe123"><dest><xNome>CLIENTE TESTE</xNome></dest></infNFe></NFe></nfeProc>';

function u16(v: number) {
  return [v & 0xff, (v >> 8) & 0xff];
}

function u32(v: number) {
  return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff];
}

async function comprimir(dados: Uint8Array): Promise<Uint8Array> {
  const fluxo = new Blob([dados as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(fluxo).arrayBuffer());
}

interface ItemZip {
  nome: string;
  conteudo: string;
  /** 0 = guardado como esta, 8 = deflate. */
  metodo?: 0 | 8;
  /** Liga o bit de "protegido por senha" (nao chega a cifrar nada). */
  comSenha?: boolean;
}

/** Monta um .zip de verdade, byte a byte, para o teste nao depender de fixture. */
async function montarZip(itens: ItemZip[]): Promise<File> {
  const partes: number[] = [];
  const diretorio: number[] = [];

  for (const item of itens) {
    const metodo = item.metodo ?? 8;
    const cru = new TextEncoder().encode(item.conteudo);
    const dados = metodo === 0 ? cru : await comprimir(cru);
    const nome = [...new TextEncoder().encode(item.nome)];
    const bandeiras = item.comSenha ? 0x1 : 0;
    const posicao = partes.length;

    partes.push(
      ...u32(0x04034b50),
      ...u16(20),
      ...u16(bandeiras),
      ...u16(metodo),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(dados.length),
      ...u32(cru.length),
      ...u16(nome.length),
      ...u16(0),
      ...nome,
      ...dados
    );

    diretorio.push(
      ...u32(0x02014b50),
      ...u16(20),
      ...u16(20),
      ...u16(bandeiras),
      ...u16(metodo),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(dados.length),
      ...u32(cru.length),
      ...u16(nome.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(posicao),
      ...nome
    );
  }

  const inicioDiretorio = partes.length;
  const fim = [
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(itens.length),
    ...u16(itens.length),
    ...u32(diretorio.length),
    ...u32(inicioDiretorio),
    ...u16(0),
  ];

  const bytes = new Uint8Array([...partes, ...diretorio, ...fim]);
  return new File([bytes as BlobPart], "notas.zip", { type: "application/zip" });
}

describe("formatoCompactado", () => {
  it("reconhece os pacotes pelo nome", () => {
    expect(formatoCompactado("notas.zip")).toBe("zip");
    expect(formatoCompactado("NOTAS.ZIP")).toBe("zip");
    expect(formatoCompactado("notas.rar")).toBe("rar");
    expect(formatoCompactado("notas.7z")).toBe("7z");
    expect(formatoCompactado("nota.xml")).toBeNull();
    expect(formatoCompactado("nota.pdf")).toBeNull();
  });
});

describe("extrairDocumentosDoZip", () => {
  it("tira o XML de dentro do zip com o conteudo intacto", async () => {
    const zip = await montarZip([{ nome: "35260101.xml", conteudo: XML_NFE }]);
    const documentos = await extrairDocumentosDoZip(zip);

    expect(documentos).toHaveLength(1);
    expect(documentos[0].name).toBe("35260101.xml");
    expect(await documentos[0].text()).toBe(XML_NFE);
  });

  it("abre tambem item guardado sem compactacao", async () => {
    const zip = await montarZip([
      { nome: "35260102.xml", conteudo: XML_NFE, metodo: 0 },
    ]);
    const documentos = await extrairDocumentosDoZip(zip);

    expect(await documentos[0].text()).toBe(XML_NFE);
  });

  it("usa so o nome do arquivo quando ele vem dentro de uma pasta", async () => {
    const zip = await montarZip([
      { nome: "notas/outubro/35260103.xml", conteudo: XML_NFE },
    ]);
    const documentos = await extrairDocumentosDoZip(zip);

    expect(documentos[0].name).toBe("35260103.xml");
  });

  it("ignora o que nao e XML nem PDF, inclusive o lixo do macOS", async () => {
    const zip = await montarZip([
      { nome: "leia-me.txt", conteudo: "nada aqui" },
      { nome: "__MACOSX/._35260104.xml", conteudo: "lixo" },
      { nome: "35260104.xml", conteudo: XML_NFE },
    ]);
    const documentos = await extrairDocumentosDoZip(zip);

    expect(documentos.map((d) => d.name)).toEqual(["35260104.xml"]);
  });

  it("recusa item protegido por senha", async () => {
    const zip = await montarZip([
      { nome: "35260105.xml", conteudo: XML_NFE, comSenha: true },
    ]);

    await expect(extrairDocumentosDoZip(zip)).rejects.toBeInstanceOf(PacoteErro);
  });

  it("recusa arquivo que nao e zip", async () => {
    const falso = new File(
      [new TextEncoder().encode(XML_NFE) as BlobPart],
      "nota.zip"
    );

    await expect(extrairDocumentosDoZip(falso)).rejects.toBeInstanceOf(PacoteErro);
  });

  it("devolve lista vazia quando o pacote nao tem documento nenhum", async () => {
    const zip = await montarZip([{ nome: "leia-me.txt", conteudo: "nada" }]);

    await expect(extrairDocumentosDoZip(zip)).resolves.toEqual([]);
  });
});

/**
 * selecionarDocumentos e a regra que .zip e .rar compartilham: o .rar e aberto
 * no servidor (pacote-actions.ts) e cai exatamente aqui, entao e isto que
 * garante que os dois formatos devolvem a mesma coisa.
 */
describe("selecionarDocumentos", () => {
  function item(caminho: string, extras: Partial<ItemDoPacote> = {}): ItemDoPacote {
    return {
      caminho,
      tamanhoCru: XML_NFE.length,
      protegido: false,
      ler: async () => new TextEncoder().encode(XML_NFE),
      ...extras,
    };
  }

  it("fica so com XML e PDF, usando o nome sem a pasta", async () => {
    const documentos = await selecionarDocumentos("notas.rar", [
      item("notas/2026/35260201.xml"),
      item("notas/leia-me.txt"),
      item("notas/"),
      item("__MACOSX/._35260201.xml"),
      item("notas/.DS_Store"),
    ]);

    expect(documentos.map((d) => d.name)).toEqual(["35260201.xml"]);
    expect(await documentos[0].text()).toBe(XML_NFE);
  });

  it("recusa item protegido por senha", async () => {
    await expect(
      selecionarDocumentos("notas.rar", [item("35260202.xml", { protegido: true })])
    ).rejects.toBeInstanceOf(PacoteErro);
  });

  it("recusa documento maior que o limite do tipo", async () => {
    await expect(
      selecionarDocumentos("notas.rar", [
        item("35260203.xml", { tamanhoCru: 50 * 1024 * 1024 }),
      ])
    ).rejects.toBeInstanceOf(PacoteErro);
  });

  it("guarda so a primeira quando o mesmo nome vem em duas pastas", async () => {
    const documentos = await selecionarDocumentos("notas.rar", [
      item("janeiro/35260204.xml"),
      item("fevereiro/35260204.xml"),
    ]);

    expect(documentos).toHaveLength(1);
  });

  it("nao descompacta o que nao interessa", async () => {
    let lidos = 0;
    const contar = async () => {
      lidos++;
      return new TextEncoder().encode(XML_NFE);
    };
    await selecionarDocumentos("notas.rar", [
      item("video.mp4", { ler: contar }),
      item("35260205.xml", { ler: contar }),
    ]);

    expect(lidos).toBe(1);
  });
});

describe("bytesDeBase64", () => {
  it("devolve os mesmos bytes que o servidor mandou", () => {
    const original = new TextEncoder().encode(XML_NFE);
    const base64 = Buffer.from(original).toString("base64");

    expect([...bytesDeBase64(base64)]).toEqual([...original]);
  });
});
