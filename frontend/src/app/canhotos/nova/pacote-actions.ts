"use server";

import {
  MAX_BYTES_PACOTE,
  MAX_ITENS_PACOTE,
  PacoteErro,
  selecionarDocumentos,
  type ItemDoPacote,
} from "@/lib/arquivo-compactado";
import { MAX_BYTES_PDF, MAX_BYTES_XML, extensaoDocumento } from "@/lib/documento-fiscal";
import { obterOperadorAutenticado } from "@/lib/operador-auth";
import { checarRateLimit } from "@/lib/rate-limit";

/**
 * Abre um .rar aqui no servidor e devolve os XML/PDF de dentro (pedido do
 * usuário, 2026-10-26). O .zip o navegador abre sozinho, sem subir nada — ver
 * `arquivo-compactado.ts`. O .rar é formato fechado e precisa do wasm do
 * unrar (~200 KB): deixá-lo no servidor evita pesar o que o celular do
 * motorista baixa.
 *
 * Aqui nada é gravado: o pacote é aberto em memória e os documentos voltam
 * para o navegador, que segue o mesmo caminho de sempre — preencher os campos
 * pelo XML e, no fim, anexar pela `anexarDocumentosEntrega`, que continua
 * sendo quem valida e grava.
 */

interface DocumentoDoPacote {
  nome: string;
  tipo: string;
  /** Conteúdo em base64 — texto simples atravessa a resposta sem surpresa. */
  base64: string;
}

export type AbrirPacoteResult =
  | { ok: true; documentos: DocumentoDoPacote[] }
  | { ok: false; error: string };

export async function abrirPacoteRar(formData: FormData): Promise<AbrirPacoteResult> {
  const operador = await obterOperadorAutenticado();
  if (!operador) return { ok: false, error: "Sessão inválida ou expirada." };

  const limite = await checarRateLimit("abrirPacoteRar");
  if (!limite.permitido) {
    return {
      ok: false,
      error: "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const pacote = formData.get("pacote");
  if (!(pacote instanceof File) || pacote.size === 0) {
    return { ok: false, error: "Nenhum pacote enviado." };
  }
  if (pacote.size > MAX_BYTES_PACOTE) {
    return {
      ok: false,
      error: `"${pacote.name}" é grande demais (máximo ${MAX_BYTES_PACOTE / 1024 / 1024} MB).`,
    };
  }

  try {
    const documentos = await extrairDoRar(pacote);
    return {
      ok: true,
      documentos: await Promise.all(
        documentos.map(async (arquivo) => ({
          nome: arquivo.name,
          tipo: arquivo.type,
          base64: Buffer.from(await arquivo.arrayBuffer()).toString("base64"),
        }))
      ),
    };
  } catch (erro) {
    if (erro instanceof PacoteErro) return { ok: false, error: erro.message };
    return {
      ok: false,
      error: `Não foi possível abrir "${pacote.name}" — descompacte o arquivo e anexe o XML.`,
    };
  }
}

/** Todo .rar começa com "Rar!\x1a\x07" — RAR4 e RAR5. */
const ASSINATURA_RAR = [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07];

async function extrairDoRar(pacote: File): Promise<File[]> {
  const { createExtractorFromData } = await import("node-unrar-js");
  const bytes = new Uint8Array(await pacote.arrayBuffer());

  if (ASSINATURA_RAR.some((byte, i) => bytes[i] !== byte)) {
    throw new PacoteErro(`"${pacote.name}" não parece ser um arquivo .rar válido.`);
  }

  let extrator;
  try {
    extrator = await createExtractorFromData({
      data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });
  } catch {
    throw new PacoteErro(`"${pacote.name}" não parece ser um arquivo .rar válido.`);
  }

  let cabecalhos;
  try {
    cabecalhos = [...extrator.getFileList().fileHeaders];
  } catch {
    throw new PacoteErro(`"${pacote.name}" está incompleto, corrompido ou protegido por senha.`);
  }

  if (cabecalhos.length > MAX_ITENS_PACOTE) {
    throw new PacoteErro(`"${pacote.name}" tem arquivos demais dentro.`);
  }

  // Só vale a pena descompactar o que tem chance de virar documento: XML e PDF
  // dentro do limite de tamanho. O resto nem é tocado.
  const interessam = cabecalhos.filter((cabecalho) => {
    if (cabecalho.flags.directory) return false;
    const ext = extensaoDocumento(cabecalho.name);
    if (!ext) return false;
    return cabecalho.unpSize <= (ext === "xml" ? MAX_BYTES_XML : MAX_BYTES_PDF);
  });

  const conteudos = new Map<string, Uint8Array>();
  if (interessam.length > 0) {
    let extraidos;
    try {
      extraidos = [
        ...extrator.extract({ files: interessam.map((cabecalho) => cabecalho.name) }).files,
      ];
    } catch {
      throw new PacoteErro(
        `Não foi possível abrir "${pacote.name}" — ele pode estar protegido por senha ou corrompido.`
      );
    }
    for (const arquivo of extraidos) {
      if (arquivo.extraction) conteudos.set(arquivo.fileHeader.name, arquivo.extraction);
    }
  }

  const itens: ItemDoPacote[] = cabecalhos.map((cabecalho) => ({
    caminho: cabecalho.flags.directory ? `${cabecalho.name}/` : cabecalho.name,
    tamanhoCru: cabecalho.unpSize,
    protegido: cabecalho.flags.encrypted,
    ler: async () => {
      const conteudo = conteudos.get(cabecalho.name);
      if (!conteudo) {
        throw new PacoteErro(
          `"${cabecalho.name}", dentro de "${pacote.name}", não pôde ser aberto.`
        );
      }
      return conteudo;
    },
  }));

  return selecionarDocumentos(pacote.name, itens);
}
