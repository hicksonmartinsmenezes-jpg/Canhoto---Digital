import { MAX_BYTES_PDF, MAX_BYTES_XML, extensaoDocumento } from "@/lib/documento-fiscal";

/**
 * Abre pacotes compactados para que o operador anexe o XML da NF-e sem
 * precisar descompactar antes (pedido do usuário, 2026-10-26: "preciso que eu
 * consiga enviar o arquivo xml compactado (winrar ou qualquer outro) para o
 * campo").
 *
 * São dois caminhos, porque os formatos são muito diferentes:
 *
 * - `.zip` é lido aqui mesmo, no navegador, sem biblioteca nova: o formato é
 *   simples (diretório central + cabeçalho local de cada item) e o conteúdo
 *   comprimido é inflado pelo DecompressionStream que o navegador já tem.
 * - `.rar` é lido no servidor (ver `pacote-actions.ts`), com a biblioteca
 *   node-unrar-js. O formato é fechado e exige um wasm de ~200 KB — que fica
 *   no servidor, sem pesar no que o celular do motorista baixa.
 *
 * Nos dois casos sai o mesmo resultado: os XML e PDF de dentro do pacote, já
 * como File, seguindo exatamente o caminho de um arquivo escolhido solto. O
 * que o servidor aceita no fim continua igual (ver anexos-actions.ts).
 */

/** Pacote inteiro: generoso perto dos limites por arquivo, mas evita travar o navegador. */
export const MAX_BYTES_PACOTE = 16 * 1024 * 1024;

/** Quantos itens do pacote são olhados — pacote maior que isso é recusado. */
export const MAX_ITENS_PACOTE = 200;

export type FormatoCompactado = "zip" | "rar" | "7z" | "gzip";

/** Erro com mensagem já pronta para mostrar ao operador. */
export class PacoteErro extends Error {}

/** Diz, pelo nome, se o arquivo escolhido é um pacote compactado. */
export function formatoCompactado(nome: string): FormatoCompactado | null {
  const ext = nome.trim().toLowerCase().split(".").pop();
  if (ext === "zip") return "zip";
  if (ext === "rar") return "rar";
  if (ext === "7z") return "7z";
  if (ext === "gz" || ext === "tgz") return "gzip";
  return null;
}

/**
 * Um item de dentro do pacote, do jeito que o leitor de cada formato consegue
 * descrever antes de gastar tempo descompactando.
 */
export interface ItemDoPacote {
  /** Caminho como está gravado no pacote, com pastas. */
  caminho: string;
  /** Tamanho depois de descompactado, declarado pelo próprio pacote. */
  tamanhoCru: number;
  /** Item protegido por senha. */
  protegido: boolean;
  /** Descompacta o item. Só é chamada para o que realmente interessa. */
  ler: (limite: number) => Promise<Uint8Array>;
}

function nomeBase(caminho: string): string {
  const partes = caminho.split(/[\\/]/);
  return partes[partes.length - 1] || caminho;
}

/** Pastas, lixo do macOS e arquivos ocultos não contam como documento. */
function ehLixo(caminho: string): boolean {
  if (caminho.endsWith("/") || caminho.endsWith("\\")) return true;
  if (caminho.startsWith("__MACOSX/")) return true;
  return nomeBase(caminho).startsWith(".");
}

/**
 * Regra única de "o que sai de dentro de um pacote", para .zip e .rar darem
 * exatamente o mesmo resultado: só XML e PDF, dentro do limite de tamanho de
 * cada tipo, sem repetir nome e sem o lixo que as pastas trazem junto.
 */
export async function selecionarDocumentos(
  nomePacote: string,
  itens: ItemDoPacote[]
): Promise<File[]> {
  if (itens.length > MAX_ITENS_PACOTE) {
    throw new PacoteErro(`"${nomePacote}" tem arquivos demais dentro.`);
  }

  const documentos: File[] = [];
  const vistos = new Set<string>();

  for (const item of itens) {
    if (ehLixo(item.caminho)) continue;
    const nome = nomeBase(item.caminho);
    const ext = extensaoDocumento(nome);
    if (!ext) continue;

    if (item.protegido) {
      throw new PacoteErro(`"${nome}", dentro de "${nomePacote}", está protegido por senha.`);
    }

    const maximo = ext === "xml" ? MAX_BYTES_XML : MAX_BYTES_PDF;
    if (item.tamanhoCru > maximo) {
      throw new PacoteErro(`"${nome}" é grande demais (máximo ${maximo / 1024 / 1024} MB).`);
    }

    if (vistos.has(nome)) continue;
    vistos.add(nome);

    const conteudo = await item.ler(maximo);
    documentos.push(
      new File([conteudo as BlobPart], nome, {
        type: ext === "xml" ? "text/xml" : "application/pdf",
      })
    );
  }

  return documentos;
}

/** base64 -> bytes, para receber de volta o que o servidor tirou do .rar. */
export function bytesDeBase64(base64: string): Uint8Array {
  const texto = atob(base64);
  const bytes = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i++) bytes[i] = texto.charCodeAt(i);
  return bytes;
}

function lerU16(b: Uint8Array, p: number): number {
  return b[p] | (b[p + 1] << 8);
}

function lerU32(b: Uint8Array, p: number): number {
  return (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16)) + b[p + 3] * 0x1000000;
}

const ASSINATURA_EOCD = 0x06054b50;
const ASSINATURA_ITEM = 0x02014b50;
const ASSINATURA_LOCAL = 0x04034b50;

/**
 * Acha o "fim do diretório central", o único ponto do ZIP com posição previsível:
 * fica no fim do arquivo, depois de um comentário de até 64 KB.
 */
function acharFimDoDiretorio(b: Uint8Array): number | null {
  const limite = Math.max(0, b.length - 22 - 0xffff);
  for (let p = b.length - 22; p >= limite; p--) {
    if (lerU32(b, p) === ASSINATURA_EOCD) return p;
  }
  return null;
}

async function inflar(dados: Uint8Array, limite: number, onde: string): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new PacoteErro(
      "Este navegador não consegue abrir arquivos .zip — descompacte o arquivo e anexe o XML."
    );
  }
  const leitor = new Blob([dados as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"))
    .getReader();

  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.length;
    if (total > limite) {
      await leitor.cancel();
      throw new PacoteErro(`"${onde}" é grande demais depois de descompactado.`);
    }
    partes.push(value);
  }

  const saida = new Uint8Array(total);
  let p = 0;
  for (const parte of partes) {
    saida.set(parte, p);
    p += parte.length;
  }
  return saida;
}

/**
 * Tira de dentro do .zip os arquivos XML e PDF, já como File, prontos para
 * seguirem o mesmo caminho de um arquivo escolhido solto.
 */
export async function extrairDocumentosDoZip(arquivo: File): Promise<File[]> {
  if (arquivo.size > MAX_BYTES_PACOTE) {
    throw new PacoteErro(
      `"${arquivo.name}" é grande demais (máximo ${MAX_BYTES_PACOTE / 1024 / 1024} MB).`
    );
  }

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const fim = acharFimDoDiretorio(bytes);
  if (fim === null) {
    throw new PacoteErro(`"${arquivo.name}" não parece ser um arquivo .zip válido.`);
  }

  const quantidade = lerU16(bytes, fim + 8);
  let p = lerU32(bytes, fim + 16);
  if (quantidade === 0xffff || p === 0xffffffff) {
    throw new PacoteErro(`"${arquivo.name}" usa ZIP64 — descompacte o arquivo e anexe o XML.`);
  }
  if (quantidade > MAX_ITENS_PACOTE) {
    throw new PacoteErro(`"${arquivo.name}" tem arquivos demais dentro.`);
  }

  const itens: ItemDoPacote[] = [];

  for (let i = 0; i < quantidade; i++) {
    if (p + 46 > bytes.length || lerU32(bytes, p) !== ASSINATURA_ITEM) {
      throw new PacoteErro(`"${arquivo.name}" está incompleto ou corrompido.`);
    }
    const bandeiras = lerU16(bytes, p + 8);
    const metodo = lerU16(bytes, p + 10);
    const tamanhoComprimido = lerU32(bytes, p + 20);
    const tamanhoCru = lerU32(bytes, p + 24);
    const tamanhoNome = lerU16(bytes, p + 28);
    const tamanhoExtra = lerU16(bytes, p + 30);
    const tamanhoComentario = lerU16(bytes, p + 32);
    const posicaoLocal = lerU32(bytes, p + 42);
    const caminho = new TextDecoder("utf-8").decode(bytes.subarray(p + 46, p + 46 + tamanhoNome));
    p += 46 + tamanhoNome + tamanhoExtra + tamanhoComentario;

    itens.push({
      caminho,
      tamanhoCru,
      protegido: (bandeiras & 0x1) !== 0,
      ler: async (limite) => {
        const nome = nomeBase(caminho);
        if (metodo !== 0 && metodo !== 8) {
          throw new PacoteErro(
            `"${nome}", dentro de "${arquivo.name}", usa uma compactação que não sei abrir.`
          );
        }
        if (posicaoLocal + 30 > bytes.length || lerU32(bytes, posicaoLocal) !== ASSINATURA_LOCAL) {
          throw new PacoteErro(`"${arquivo.name}" está incompleto ou corrompido.`);
        }
        const inicio =
          posicaoLocal + 30 + lerU16(bytes, posicaoLocal + 26) + lerU16(bytes, posicaoLocal + 28);
        const fimDados = inicio + tamanhoComprimido;
        if (fimDados > bytes.length) {
          throw new PacoteErro(`"${arquivo.name}" está incompleto ou corrompido.`);
        }
        const dados = bytes.slice(inicio, fimDados);
        return metodo === 0 ? dados : inflar(dados, limite, nome);
      },
    });
  }

  return selecionarDocumentos(arquivo.name, itens);
}
