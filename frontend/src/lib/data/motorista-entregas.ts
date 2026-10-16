import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { entregaAnexos, entregas } from "@/lib/db/schema";
import { formatBRL, formatCep } from "@/lib/format";
import { montarEnderecoRoteavel } from "@/lib/endereco-rota";
import type { FormaPagamento, StatusEntrega } from "@/types/database";

export interface EntregaMotoristaDetalhe {
  id: string;
  numero: string;
  clienteNome: string;
  clienteTelefone: string;
  endereco: string;
  cep: string;
  latitude: number | null;
  longitude: number | null;
  enderecoRoteavel: string;
  numeroPedido: string;
  numeroNfe: string;
  valor: string;
  formaPagamento: FormaPagamento;
  observacoes: string;
  status: StatusEntrega;
  horaSaida: string | null;
  clienteAssinouEm: string | null;
  /** Rota com várias paradas a que a entrega pertence (null = entrega solta). */
  rota: {
    /** Posição desta entrega na rota (1 = primeira parada). */
    posicao: number;
    total: number;
    /** Próxima parada ainda em aberto, depois desta (null = não há). */
    proximaId: string | null;
  } | null;
  /** Comprovantes já recebidos pelo servidor (só preenchido quando concluída). */
  comprovantes: { foto: boolean; produto: number; pix: boolean };
}

export async function getEntregaMotoristaDetalhe(
  motoboyId: string,
  entregaId: string
): Promise<EntregaMotoristaDetalhe | null> {
  const db = getDb();
  if (!db) return null;

  const [entrega] = await db
    .select({
      id: entregas.id,
      numero: entregas.numero,
      clienteNome: entregas.clienteNome,
      clienteTelefone: entregas.clienteTelefone,
      endereco: entregas.endereco,
      cep: entregas.cep,
      latitude: entregas.latitude,
      longitude: entregas.longitude,
      numeroPedido: entregas.numeroPedido,
      numeroNfe: entregas.numeroNfe,
      valorPagamento: entregas.valorPagamento,
      formaPagamento: entregas.formaPagamento,
      observacoes: entregas.observacoes,
      status: entregas.status,
      horaSaida: entregas.horaSaida,
      clienteAssinouEm: entregas.clienteAssinouEm,
      rotaId: entregas.rotaId,
      rotaOrdem: entregas.rotaOrdem,
    })
    .from(entregas)
    .where(
      and(
        eq(entregas.id, entregaId),
        eq(entregas.motoboyId, motoboyId)
      )
    )
    .limit(1);

  if (!entrega) return null;

  const comprovantes = { foto: false, produto: 0, pix: false };
  if (entrega.status === "entregue") {
    const anexos = await db
      .select({ tipo: entregaAnexos.tipo })
      .from(entregaAnexos)
      .where(eq(entregaAnexos.entregaId, entrega.id));
    for (const anexo of anexos) {
      if (anexo.tipo === "foto") comprovantes.foto = true;
      else if (anexo.tipo === "foto_produto") comprovantes.produto += 1;
      else if (anexo.tipo === "comprovante_pix") comprovantes.pix = true;
    }
  }

  let rota: EntregaMotoristaDetalhe["rota"] = null;
  if (entrega.rotaId && entrega.rotaOrdem !== null) {
    const paradas = await db
      .select({
        id: entregas.id,
        ordem: entregas.rotaOrdem,
        status: entregas.status,
      })
      .from(entregas)
      .where(
        and(
          eq(entregas.rotaId, entrega.rotaId),
          eq(entregas.motoboyId, motoboyId)
        )
      )
      .orderBy(asc(entregas.rotaOrdem));

    if (paradas.length > 1) {
      const proxima = paradas.find(
        (parada) =>
          (parada.ordem ?? 0) > (entrega.rotaOrdem ?? 0) &&
          parada.status === "pendente"
      );
      rota = {
        posicao: entrega.rotaOrdem,
        total: paradas.length,
        proximaId: proxima?.id ?? null,
      };
    }
  }

  const enderecoRoteavel = await montarEnderecoRoteavel({
    endereco: entrega.endereco ?? "",
    cep: entrega.cep ?? "",
  });

  return {
    id: entrega.id,
    numero: `#${entrega.numero}`,
    clienteNome: entrega.clienteNome,
    clienteTelefone: entrega.clienteTelefone ?? "",
    endereco: entrega.endereco ?? "",
    cep: entrega.cep ? formatCep(entrega.cep) : "",
    latitude:
      entrega.latitude === null ? null : Number(entrega.latitude),
    longitude:
      entrega.longitude === null ? null : Number(entrega.longitude),
    enderecoRoteavel,
    numeroPedido: entrega.numeroPedido ?? "",
    numeroNfe: entrega.numeroNfe ?? "",
    valor: formatBRL(Number(entrega.valorPagamento)),
    formaPagamento: entrega.formaPagamento,
    observacoes: entrega.observacoes ?? "",
    status: entrega.status,
    horaSaida: entrega.horaSaida,
    clienteAssinouEm: entrega.clienteAssinouEm,
    rota,
    comprovantes,
  };
}
