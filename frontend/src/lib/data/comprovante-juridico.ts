import "server-only";

import { readFile } from "node:fs/promises";
import { and, asc, eq, isNull } from "drizzle-orm";
import {
  codigoVerificacao,
  situacaoIntegridade,
  sha256Hex,
  type SituacaoIntegridade,
} from "@/lib/comprovante-integridade";
import { resolverArquivoComprovante } from "@/lib/comprovantes-storage";
import { getDb } from "@/lib/db";
import { entregaAnexos, entregas, motoboys } from "@/lib/db/schema";

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

/**
 * Entregas concluídas antes da migration 0024 não têm o código guardado.
 * Na primeira vez que o comprovante é aberto, o código calculado é gravado
 * (só se ainda estiver vazio; o banco não deixa trocá-lo depois).
 */
export async function garantirCodigoVerificacao(
  entregaId: string,
  codigo: string
): Promise<void> {
  const db = getDb();
  if (!db) return;

  try {
    await db
      .update(entregas)
      .set({ codigoVerificacao: codigo })
      .where(and(eq(entregas.id, entregaId), isNull(entregas.codigoVerificacao)));
  } catch {
    // Só deixa de guardar; o comprovante continua abrindo com o código calculado.
  }
}

export interface VerificacaoComprovante {
  entregaNumero: number;
  numeroPedido: string;
  numeroNfe: string | null;
  clienteFinal: boolean;
  recebedorNome: string;
  recebedorVinculo: string | null;
  concluidaEm: string;
  motoboyNome: string;
  anexos: Pick<AnexoComIntegridade, "tipo" | "situacao">[];
  /** Os dados do pedido ainda geram o mesmo código gravado na conclusão. */
  dadosConferem: boolean;
}

/** Consulta pública: devolve só o necessário para conferir o papel impresso. */
export async function getVerificacaoPorCodigo(
  codigo: string
): Promise<VerificacaoComprovante | null> {
  const db = getDb();
  if (!db) return null;

  const [entrega] = await db
    .select({
      id: entregas.id,
      numero: entregas.numero,
      numeroPedido: entregas.numeroPedido,
      numeroNfe: entregas.numeroNfe,
      clienteFinal: entregas.clienteFinal,
      recebedorNome: entregas.recebedorNome,
      recebedorVinculo: entregas.recebedorVinculo,
      concluidaEm: entregas.clienteAssinouEm,
      motoboyNome: motoboys.nome,
    })
    .from(entregas)
    .leftJoin(motoboys, eq(entregas.motoboyId, motoboys.id))
    .where(eq(entregas.codigoVerificacao, codigo))
    .limit(1);

  if (!entrega || !entrega.concluidaEm) return null;

  const anexos = await getAnexosComIntegridade(entrega.id);
  const recebedorNome = entrega.recebedorNome ?? "";

  const codigoAtual = codigoVerificacao({
    entregaId: entrega.id,
    numeroPedido: entrega.numeroPedido ?? "",
    numeroNfe: entrega.numeroNfe ?? "",
    recebedorNome,
    recebedorVinculo: entrega.recebedorVinculo,
    concluidaEm: entrega.concluidaEm,
    motoboyNome: entrega.motoboyNome ?? "",
    hashesAnexos: anexos.flatMap((anexo) => (anexo.sha256 ? [anexo.sha256] : [])),
  });

  return {
    entregaNumero: entrega.numero,
    numeroPedido: entrega.numeroPedido ?? "",
    numeroNfe: entrega.numeroNfe,
    clienteFinal: entrega.clienteFinal,
    recebedorNome,
    recebedorVinculo: entrega.recebedorVinculo,
    concluidaEm: entrega.concluidaEm,
    motoboyNome: entrega.motoboyNome ?? "",
    anexos: anexos.map(({ tipo, situacao }) => ({ tipo, situacao })),
    dadosConferem: codigoAtual === codigo,
  };
}
