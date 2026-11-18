import "server-only";

import { readFile } from "node:fs/promises";
import { asc, eq } from "drizzle-orm";
import {
  situacaoIntegridade,
  sha256Hex,
  type SituacaoIntegridade,
} from "@/lib/comprovante-integridade";
import { resolverArquivoComprovante } from "@/lib/comprovantes-storage";
import { getDb } from "@/lib/db";
import { entregaAnexos } from "@/lib/db/schema";

export interface AnexoComIntegridade {
  id: string;
  tipo: "foto" | "foto_produto" | "comprovante_pix";
  capturadoEm: string;
  sha256: string | null;
  situacao: SituacaoIntegridade;
}

/** Anexos da prova de entrega com a conferência do arquivo no disco. */
export async function getAnexosComIntegridade(
  entregaId: string
): Promise<AnexoComIntegridade[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: entregaAnexos.id,
      tipo: entregaAnexos.tipo,
      arquivoUrl: entregaAnexos.arquivoUrl,
      capturadoEm: entregaAnexos.capturadoEm,
      sha256: entregaAnexos.sha256,
    })
    .from(entregaAnexos)
    .where(eq(entregaAnexos.entregaId, entregaId))
    .orderBy(asc(entregaAnexos.capturadoEm));

  const resultado: AnexoComIntegridade[] = [];
  for (const anexo of rows) {
    if (
      anexo.tipo !== "foto" &&
      anexo.tipo !== "foto_produto" &&
      anexo.tipo !== "comprovante_pix"
    ) {
      continue;
    }

    let atual: string | null = null;
    const arquivo = resolverArquivoComprovante(anexo.arquivoUrl);
    if (arquivo) {
      try {
        atual = sha256Hex(await readFile(arquivo.caminho));
      } catch {
        atual = null;
      }
    }

    resultado.push({
      id: anexo.id,
      tipo: anexo.tipo,
      capturadoEm: anexo.capturadoEm,
      sha256: anexo.sha256?.trim() ?? null,
      situacao: situacaoIntegridade(anexo.sha256?.trim() ?? null, atual),
    });
  }

  return resultado;
}
