"use server";

import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { entregaAnexos, entregas } from "@/lib/db/schema";
import {
  diretorioRaizUploads,
  diretorioRelativoEntrega,
} from "@/lib/comprovantes-storage";
import {
  MAX_BYTES_PDF,
  MAX_BYTES_XML,
  MAX_DOCUMENTOS_ENTREGA,
  ehPdf,
  extensaoDocumento,
  tipoDoXmlFiscal,
  type TipoDocumentoAnexo,
} from "@/lib/documento-fiscal";
import { obterOperadorAutenticado } from "@/lib/operador-auth";
import { checarRateLimit } from "@/lib/rate-limit";

export interface AnexarDocumentosResult {
  ok: boolean;
  error?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Anexa XML (NF-e/CT-e) e PDF (DANFE) a uma entrega recém-cadastrada.
 * Tudo ou nada: se um arquivo for recusado, nenhum é gravado.
 */
export async function anexarDocumentosEntrega(
  entregaId: string,
  formData: FormData
): Promise<AnexarDocumentosResult> {
  const operador = await obterOperadorAutenticado();
  if (!operador) return { ok: false, error: "Sessão inválida ou expirada." };

  const limite = await checarRateLimit("anexarDocumentosEntrega");
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  if (!UUID_RE.test(entregaId)) {
    return { ok: false, error: "Entrega inválida." };
  }

  const db = getDb();
  if (!db) {
    return {
      ok: false,
      error:
        "Banco de dados indisponível neste ambiente — confirme a DATABASE_URL.",
    };
  }

  const arquivos = formData
    .getAll("documentos")
    .filter((item): item is File => item instanceof File && item.size > 0);
  if (arquivos.length === 0) return { ok: true };

  const [entrega] = await db
    .select({
      numero: entregas.numero,
      clienteNome: entregas.clienteNome,
      setorId: entregas.setorId,
    })
    .from(entregas)
    .where(eq(entregas.id, entregaId))
    .limit(1);

  if (
    !entrega ||
    (operador.tipo === "gestor_setor" && entrega.setorId !== operador.setorId)
  ) {
    return { ok: false, error: "Entrega não encontrada." };
  }

  if (arquivos.length > MAX_DOCUMENTOS_ENTREGA) {
    return {
      ok: false,
      error: `Anexe no máximo ${MAX_DOCUMENTOS_ENTREGA} documentos por entrega.`,
    };
  }

  const pastaRelativa = diretorioRelativoEntrega(
    entrega.clienteNome,
    entrega.numero
  );
  const pasta = path.join(diretorioRaizUploads(), ...pastaRelativa.split("/"));

  const preparados: Array<{
    tipo: TipoDocumentoAnexo;
    bytes: Uint8Array;
    nome: string;
  }> = [];

  for (const arquivo of arquivos) {
    const ext = extensaoDocumento(arquivo.name);
    if (!ext) {
      return {
        ok: false,
        error: `"${arquivo.name}": só é possível anexar arquivos XML ou PDF.`,
      };
    }
    const maximo = ext === "xml" ? MAX_BYTES_XML : MAX_BYTES_PDF;
    if (arquivo.size > maximo) {
      return {
        ok: false,
        error: `"${arquivo.name}" é grande demais (máximo ${maximo / 1024 / 1024} MB).`,
      };
    }

    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    if (ext === "pdf") {
      if (!ehPdf(bytes)) {
        return { ok: false, error: `"${arquivo.name}" não é um PDF válido.` };
      }
      preparados.push({
        tipo: "danfe_pdf",
        bytes,
        nome: `nota-${randomUUID()}.pdf`,
      });
      continue;
    }

    const tipo = tipoDoXmlFiscal(new TextDecoder("utf-8").decode(bytes));
    if (!tipo) {
      return {
        ok: false,
        error: `"${arquivo.name}" não parece ser o XML de uma NF-e ou CT-e.`,
      };
    }
    preparados.push({ tipo, bytes, nome: `nota-${randomUUID()}.xml` });
  }

  const gravados: string[] = [];
  try {
    await mkdir(pasta, { recursive: true });
    for (const item of preparados) {
      const caminho = path.join(pasta, item.nome);
      await writeFile(caminho, item.bytes, { flag: "wx" });
      gravados.push(caminho);
    }

    await db.insert(entregaAnexos).values(
      preparados.map((item) => ({
        entregaId,
        tipo: item.tipo,
        arquivoUrl: `${pastaRelativa}/${item.nome}`,
        capturadoPor: operador.colaboradorId,
      }))
    );
  } catch {
    await Promise.allSettled(
      gravados.map((caminho) => rm(caminho, { force: true }))
    );
    return {
      ok: false,
      error:
        "Não foi possível salvar os documentos. Confirme se a migration 0017 foi aplicada e tente de novo.",
    };
  }

  revalidatePath(`/canhotos/${entregaId}`);
  return { ok: true };
}
