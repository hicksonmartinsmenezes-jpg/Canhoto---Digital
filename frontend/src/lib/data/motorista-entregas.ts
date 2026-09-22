import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { entregas } from "@/lib/db/schema";
import { formatBRL, formatCep } from "@/lib/format";
import type { FormaPagamento, StatusEntrega } from "@/types/database";

export interface EntregaMotoristaDetalhe {
  id: string;
  numero: string;
  clienteNome: string;
  clienteTelefone: string;
  endereco: string;
  cep: string;
  numeroPedido: string;
  numeroNfe: string;
  valor: string;
  formaPagamento: FormaPagamento;
  observacoes: string;
  status: StatusEntrega;
  horaSaida: string | null;
  clienteAssinouEm: string | null;
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
      numeroPedido: entregas.numeroPedido,
      numeroNfe: entregas.numeroNfe,
      valorPagamento: entregas.valorPagamento,
      formaPagamento: entregas.formaPagamento,
      observacoes: entregas.observacoes,
      status: entregas.status,
      horaSaida: entregas.horaSaida,
      clienteAssinouEm: entregas.clienteAssinouEm,
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

  return {
    id: entrega.id,
    numero: `#${entrega.numero}`,
    clienteNome: entrega.clienteNome,
    clienteTelefone: entrega.clienteTelefone ?? "",
    endereco: entrega.endereco ?? "",
    cep: entrega.cep ? formatCep(entrega.cep) : "",
    numeroPedido: entrega.numeroPedido ?? "",
    numeroNfe: entrega.numeroNfe ?? "",
    valor: formatBRL(Number(entrega.valorPagamento)),
    formaPagamento: entrega.formaPagamento,
    observacoes: entrega.observacoes ?? "",
    status: entrega.status,
    horaSaida: entrega.horaSaida,
    clienteAssinouEm: entrega.clienteAssinouEm,
  };
}
