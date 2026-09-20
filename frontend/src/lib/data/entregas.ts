// Camada de acesso a dados de Entregas no PostgreSQL local via Drizzle.
//
// Sem DATABASE_URL configurada, getDb() devolve null e as funções retornam
// o mesmo estado vazio que a UI já sabe exibir. Em produção, DATABASE_URL
// será obrigatória.

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lte,
  ne,
} from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  colaboradores,
  entregaAnexos,
  entregaHistorico,
  entregas,
  motoboyLocalizacoes,
  motoboys,
  usuariosAdmin,
} from "@/lib/db/schema";
import { formatBRL, formatCep, formatDateBR } from "@/lib/format";
import type { FormaPagamento, StatusEntrega } from "@/types/database";

function paraDataInput(dataIso: string): string {
  return dataIso.slice(0, 10);
}

export interface MotoristaEmRota {
  motoboyId: string;
  nome: string;
  entregas: Array<{
    numero: string;
    cliente: string;
    endereco: string;
    cep: string;
  }>;
  latitude: number | null;
  longitude: number | null;
  precisaoMetros: number | null;
  localizacaoAtualizadaEm: string | null;
}

export async function getMotoristasEmRota(): Promise<MotoristaEmRota[]> {
  const db = getDb();
  if (!db) return [];

  const hoje = paraChaveDiaLocal(new Date());

  const rows = await db
    .select({
      motoboyId: motoboys.id,
      motoboyNome: motoboys.nome,
      numero: entregas.numero,
      clienteNome: entregas.clienteNome,
      endereco: entregas.endereco,
      cep: entregas.cep,
      latitude: motoboyLocalizacoes.latitude,
      longitude: motoboyLocalizacoes.longitude,
      precisaoMetros: motoboyLocalizacoes.precisaoMetros,
      localizacaoAtualizadaEm: motoboyLocalizacoes.atualizadoEm,
    })
    .from(entregas)
    .innerJoin(motoboys, eq(entregas.motoboyId, motoboys.id))
    .leftJoin(
      motoboyLocalizacoes,
      eq(motoboyLocalizacoes.motoboyId, motoboys.id)
    )
    .where(
      and(
        eq(entregas.data, hoje),
        eq(entregas.status, "pendente"),
        isNotNull(entregas.horaSaida),
        isNotNull(entregas.motoboyId),
        eq(motoboys.ativo, true)
      )
    )
    .orderBy(asc(motoboys.nome), asc(entregas.numero));

  const porMotorista = new Map<string, MotoristaEmRota>();

  for (const row of rows) {
    const existente = porMotorista.get(row.motoboyId);
    const entrega = {
      numero: `#${row.numero}`,
      cliente: row.clienteNome,
      endereco: row.endereco ?? "",
      cep: row.cep ? formatCep(row.cep) : "",
    };

    if (existente) {
      existente.entregas.push(entrega);
      continue;
    }

    porMotorista.set(row.motoboyId, {
      motoboyId: row.motoboyId,
      nome: row.motoboyNome,
      entregas: [entrega],
      latitude: row.latitude === null ? null : Number(row.latitude),
      longitude: row.longitude === null ? null : Number(row.longitude),
      precisaoMetros:
        row.precisaoMetros === null ? null : Number(row.precisaoMetros),
      localizacaoAtualizadaEm: row.localizacaoAtualizadaEm,
    });
  }

  return Array.from(porMotorista.values());
}

export interface DashboardStats {
  totalEntregas: number;
  entregues: number;
  pendentes: number;
  motoristasAtivos: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = getDb();
  if (!db) {
    return {
      totalEntregas: 0,
      entregues: 0,
      pendentes: 0,
      motoristasAtivos: 0,
    };
  }

  const [total, entregues, pendentes, motoristasAtivos] = await Promise.all([
    db.select({ total: count() }).from(entregas),
    db
      .select({ total: count() })
      .from(entregas)
      .where(eq(entregas.status, "entregue")),
    db
      .select({ total: count() })
      .from(entregas)
      .where(eq(entregas.status, "pendente")),
    db
      .select({ total: count() })
      .from(motoboys)
      .where(eq(motoboys.ativo, true)),
  ]);

  return {
    totalEntregas: total[0]?.total ?? 0,
    entregues: entregues[0]?.total ?? 0,
    pendentes: pendentes[0]?.total ?? 0,
    motoristasAtivos: motoristasAtivos[0]?.total ?? 0,
  };
}

export interface EntregaPorDia {
  dataIso: string;
  dataFormatada: string;
  total: number;
}

function paraChaveDiaLocal(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export async function getEntregasPorDia(dias = 14): Promise<EntregaPorDia[]> {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - (dias - 1));

  const porDia = new Map<string, number>();
  for (let i = 0; i < dias; i++) {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    porDia.set(paraChaveDiaLocal(d), 0);
  }

  const db = getDb();
  if (db) {
    const rows = await db
      .select({ data: entregas.data })
      .from(entregas)
      .where(
        and(
          gte(entregas.data, paraChaveDiaLocal(inicio)),
          lte(entregas.data, paraChaveDiaLocal(hoje))
        )
      );

    for (const entrega of rows) {
      const chave = entrega.data.slice(0, 10);
      if (porDia.has(chave)) {
        porDia.set(chave, (porDia.get(chave) ?? 0) + 1);
      }
    }
  }

  return Array.from(porDia.entries()).map(([dataIso, total]) => {
    const [, mes, dia] = dataIso.split("-");
    return { dataIso, dataFormatada: `${dia}/${mes}`, total };
  });
}

export interface EntregaRecente {
  numero: string;
  cliente: string;
  valor: string;
  formaPagamento: FormaPagamento;
  data: string;
  status: StatusEntrega;
}

export async function getEntregasRecentes(
  limit = 5
): Promise<EntregaRecente[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({
      numero: entregas.numero,
      clienteNome: entregas.clienteNome,
      valorPagamento: entregas.valorPagamento,
      formaPagamento: entregas.formaPagamento,
      data: entregas.data,
      status: entregas.status,
    })
    .from(entregas)
    .orderBy(desc(entregas.criadoEm))
    .limit(limit);

  return rows.map((entrega) => ({
    numero: `#${entrega.numero}`,
    cliente: entrega.clienteNome,
    valor: formatBRL(Number(entrega.valorPagamento)),
    formaPagamento: entrega.formaPagamento,
    data: formatDateBR(entrega.data),
    status: entrega.status,
  }));
}

export interface Alerta {
  id: string;
  tag: string;
  titulo: string;
  descricao: string;
  tom: "critico" | "atencao" | "info";
  href?: string;
}

function pluralEntregas(n: number): string {
  return n === 1 ? "1 entrega" : `${n} entregas`;
}

export async function getAlertas(): Promise<Alerta[]> {
  const db = getDb();
  if (!db) return [];

  const [aguardandoSaida, semNfe] = await Promise.all([
    db
      .select({ total: count() })
      .from(entregas)
      .where(
        and(eq(entregas.status, "pendente"), isNull(entregas.horaSaida))
      ),
    db
      .select({ total: count() })
      .from(entregas)
      .where(isNull(entregas.numeroNfe)),
  ]);

  const aguardandoSaidaTotal = aguardandoSaida[0]?.total ?? 0;
  const semNfeTotal = semNfe[0]?.total ?? 0;
  const alertas: Alerta[] = [];

  if (aguardandoSaidaTotal > 0) {
    alertas.push({
      id: "aguardando-saida",
      tag: "SAÍDA",
      titulo: `${pluralEntregas(aguardandoSaidaTotal)} aguardando saída`,
      descricao:
        "Cadastradas no sistema, mas o motorista ainda não saiu para entrega.",
      tom: "atencao",
    });
  }

  if (semNfeTotal > 0) {
    alertas.push({
      id: "sem-nfe",
      tag: "CADASTRO",
      titulo: `${pluralEntregas(semNfeTotal)} sem número de NF-e`,
      descricao: "Cadastro incompleto — dificulta a consulta depois.",
      tom: "info",
    });
  }

  return alertas;
}

export interface AtividadeItem {
  id: string;
  hora: string;
  titulo: string;
  descricao: string;
  cor: "primary" | "success" | "info" | "muted";
  timestamp: string;
}

// O histórico de status no PostgreSQL local é gravado explicitamente pela
// camada de escrita na mesma transação da mudança. Isso permite registrar o
// ator real (colaborador ou motoboy) em vez de inferi-lo por um trigger.
export async function getAtividadeRecente(
  limit = 4
): Promise<AtividadeItem[]> {
  const db = getDb();
  if (!db) return [];

  const [cadastros, mudancasStatus] = await Promise.all([
    db
      .select({
        id: entregas.id,
        numero: entregas.numero,
        clienteNome: entregas.clienteNome,
        criadoEm: entregas.criadoEm,
        cadastradoPorNome: colaboradores.nome,
        cadastradoPorAdminEmail: usuariosAdmin.email,
      })
      .from(entregas)
      .leftJoin(
        colaboradores,
        eq(entregas.cadastradoPor, colaboradores.id)
      )
      .leftJoin(
        usuariosAdmin,
        eq(entregas.cadastradoPorAdmin, usuariosAdmin.id)
      )
      .orderBy(desc(entregas.criadoEm))
      .limit(limit),
    db
      .select({
        id: entregaHistorico.id,
        statusNovo: entregaHistorico.statusNovo,
        alteradoEm: entregaHistorico.alteradoEm,
        numero: entregas.numero,
      })
      .from(entregaHistorico)
      .innerJoin(entregas, eq(entregaHistorico.entregaId, entregas.id))
      .orderBy(desc(entregaHistorico.alteradoEm))
      .limit(limit),
  ]);

  const itens: AtividadeItem[] = [];

  for (const entrega of cadastros) {
    itens.push({
      id: `cadastro-${entrega.id}`,
      hora: formatHora(entrega.criadoEm),
      titulo: "Entrega registrada",
      descricao: `${entrega.cadastradoPorNome ?? entrega.cadastradoPorAdminEmail ?? "Alguém"} cadastrou a entrega #${entrega.numero} (${entrega.clienteNome}).`,
      cor: "primary",
      timestamp: entrega.criadoEm,
    });
  }

  for (const historico of mudancasStatus) {
    if (historico.statusNovo === "entregue") {
      itens.push({
        id: `historico-${historico.id}`,
        hora: formatHora(historico.alteradoEm),
        titulo: "Entrega confirmada pelo cliente",
        descricao: `Cliente confirmou o recebimento da entrega #${historico.numero}.`,
        cor: "info",
        timestamp: historico.alteradoEm,
      });
    } else if (historico.statusNovo === "cancelado") {
      itens.push({
        id: `historico-${historico.id}`,
        hora: formatHora(historico.alteradoEm),
        titulo: "Entrega cancelada",
        descricao: `A entrega #${historico.numero} foi marcada como cancelada.`,
        cor: "muted",
        timestamp: historico.alteradoEm,
      });
    }
  }

  return itens
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, limit);
}

function formatHora(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface EntregaListItem {
  id: string;
  numero: string;
  data: string;
  cliente: string;
  numeroPedido: string | null;
  numeroNfe: string | null;
  valor: string;
  formaPagamento: FormaPagamento;
  motoboy: string | null;
  caixa: string | null;
  status: StatusEntrega;
  pendenteConferencia: boolean;
}

export async function getEntregas(
  status?: StatusEntrega
): Promise<EntregaListItem[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: entregas.id,
      numero: entregas.numero,
      data: entregas.data,
      clienteNome: entregas.clienteNome,
      numeroPedido: entregas.numeroPedido,
      numeroNfe: entregas.numeroNfe,
      valorPagamento: entregas.valorPagamento,
      formaPagamento: entregas.formaPagamento,
      status: entregas.status,
      motoboyNome: motoboys.nome,
      caixaNome: colaboradores.nome,
    })
    .from(entregas)
    .leftJoin(motoboys, eq(entregas.motoboyId, motoboys.id))
    .leftJoin(colaboradores, eq(entregas.caixaId, colaboradores.id))
    .where(status ? eq(entregas.status, status) : undefined)
    .orderBy(desc(entregas.numero));

  return rows.map((entrega) => ({
    id: entrega.id,
    numero: `#${entrega.numero}`,
    data: formatDateBR(entrega.data),
    cliente: entrega.clienteNome,
    numeroPedido: entrega.numeroPedido,
    numeroNfe: entrega.numeroNfe,
    valor: formatBRL(Number(entrega.valorPagamento)),
    formaPagamento: entrega.formaPagamento,
    motoboy: entrega.motoboyNome,
    caixa: entrega.caixaNome,
    status: entrega.status,
    pendenteConferencia:
      entrega.status === "entregue" &&
      entrega.formaPagamento !== "prazo" &&
      entrega.caixaNome === null,
  }));
}

export interface RelatorioFiltros {
  dataInicio?: string;
  dataFim?: string;
  status?: StatusEntrega;
  formaPagamento?: FormaPagamento;
}

export interface RelatorioEntregaItem {
  id: string;
  numero: string;
  data: string;
  cliente: string;
  valor: string;
  valorNumerico: number;
  formaPagamento: FormaPagamento;
  motoboy: string | null;
  status: StatusEntrega;
}

export interface RelatorioPorFormaPagamento {
  formaPagamento: FormaPagamento;
  quantidade: number;
  valor: string;
}

export interface RelatorioTotais {
  quantidade: number;
  valorTotal: string;
  ticketMedio: string;
  porFormaPagamento: RelatorioPorFormaPagamento[];
}

export interface RelatorioEntregas {
  itens: RelatorioEntregaItem[];
  totais: RelatorioTotais;
}

function relatorioVazio(): RelatorioEntregas {
  return {
    itens: [],
    totais: {
      quantidade: 0,
      valorTotal: formatBRL(0),
      ticketMedio: formatBRL(0),
      porFormaPagamento: [],
    },
  };
}

export async function getRelatorioEntregas(
  filtros: RelatorioFiltros
): Promise<RelatorioEntregas> {
  const db = getDb();
  if (!db) return relatorioVazio();

  const rows = await db
    .select({
      id: entregas.id,
      numero: entregas.numero,
      data: entregas.data,
      clienteNome: entregas.clienteNome,
      valorPagamento: entregas.valorPagamento,
      formaPagamento: entregas.formaPagamento,
      status: entregas.status,
      motoboyNome: motoboys.nome,
    })
    .from(entregas)
    .leftJoin(motoboys, eq(entregas.motoboyId, motoboys.id))
    .where(
      and(
        filtros.dataInicio
          ? gte(entregas.data, filtros.dataInicio)
          : undefined,
        filtros.dataFim ? lte(entregas.data, filtros.dataFim) : undefined,
        filtros.status
          ? eq(entregas.status, filtros.status)
          : undefined,
        filtros.formaPagamento
          ? eq(entregas.formaPagamento, filtros.formaPagamento)
          : undefined
      )
    )
    .orderBy(desc(entregas.data), desc(entregas.numero));

  const itens: RelatorioEntregaItem[] = rows.map((entrega) => ({
    id: entrega.id,
    numero: `#${entrega.numero}`,
    data: formatDateBR(entrega.data),
    cliente: entrega.clienteNome,
    valor: formatBRL(Number(entrega.valorPagamento)),
    valorNumerico: Number(entrega.valorPagamento),
    formaPagamento: entrega.formaPagamento,
    motoboy: entrega.motoboyNome,
    status: entrega.status,
  }));

  const valorTotalNumerico = itens.reduce(
    (soma, item) => soma + item.valorNumerico,
    0
  );

  const porFormaMapa = new Map<
    FormaPagamento,
    { quantidade: number; valor: number }
  >();

  for (const item of itens) {
    const atual = porFormaMapa.get(item.formaPagamento) ?? {
      quantidade: 0,
      valor: 0,
    };
    atual.quantidade += 1;
    atual.valor += item.valorNumerico;
    porFormaMapa.set(item.formaPagamento, atual);
  }

  return {
    itens,
    totais: {
      quantidade: itens.length,
      valorTotal: formatBRL(valorTotalNumerico),
      ticketMedio: formatBRL(
        itens.length > 0 ? valorTotalNumerico / itens.length : 0
      ),
      porFormaPagamento: Array.from(porFormaMapa.entries())
        .map(([formaPagamento, valor]) => ({
          formaPagamento,
          quantidade: valor.quantidade,
          valor: formatBRL(valor.valor),
        }))
        .sort((a, b) => b.quantidade - a.quantidade),
    },
  };
}

export interface EntregaDetalhe {
  id: string;
  numero: number;
  data: string;
  clienteNome: string;
  clienteTelefone: string;
  endereco: string;
  cep: string;
  numeroPedido: string;
  numeroNfe: string;
  valorPagamento: string;
  formaPagamento: FormaPagamento;
  motoboyId: string;
  motoboyNome: string;
  observacoes: string;
  status: StatusEntrega;
}

export async function getEntregaById(
  id: string
): Promise<EntregaDetalhe | null> {
  const db = getDb();
  if (!db) return null;

  const [entrega] = await db
    .select({
      id: entregas.id,
      numero: entregas.numero,
      data: entregas.data,
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
      motoboyId: entregas.motoboyId,
      motoboyNome: motoboys.nome,
    })
    .from(entregas)
    .leftJoin(motoboys, eq(entregas.motoboyId, motoboys.id))
    .where(eq(entregas.id, id))
    .limit(1);

  if (!entrega) return null;

  return {
    id: entrega.id,
    numero: entrega.numero,
    data: paraDataInput(entrega.data),
    clienteNome: entrega.clienteNome,
    clienteTelefone: entrega.clienteTelefone ?? "",
    endereco: entrega.endereco ?? "",
    cep: entrega.cep ? formatCep(entrega.cep) : "",
    numeroPedido: entrega.numeroPedido ?? "",
    numeroNfe: entrega.numeroNfe ?? "",
    valorPagamento: String(entrega.valorPagamento),
    formaPagamento: entrega.formaPagamento,
    motoboyId: entrega.motoboyId ?? "",
    motoboyNome: entrega.motoboyNome ?? "",
    observacoes: entrega.observacoes ?? "",
    status: entrega.status,
  };
}

export interface EntregaComprovante {
  id: string;
  tipo: "foto" | "assinatura_cliente";
  capturadoEm: string;
  capturadoPorMotoboy: string | null;
}

export async function getComprovantesEntrega(
  entregaId: string
): Promise<EntregaComprovante[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: entregaAnexos.id,
      tipo: entregaAnexos.tipo,
      capturadoEm: entregaAnexos.capturadoEm,
      motoboyNome: motoboys.nome,
    })
    .from(entregaAnexos)
    .leftJoin(
      motoboys,
      eq(entregaAnexos.capturadoPorMotoboy, motoboys.id)
    )
    .where(eq(entregaAnexos.entregaId, entregaId))
    .orderBy(asc(entregaAnexos.capturadoEm));

  return rows
    .filter(
      (anexo) =>
        anexo.tipo === "foto" || anexo.tipo === "assinatura_cliente"
    )
    .map((anexo) => ({
      id: anexo.id,
      tipo: anexo.tipo as "foto" | "assinatura_cliente",
      capturadoEm: anexo.capturadoEm,
      capturadoPorMotoboy: anexo.motoboyNome ?? null,
    }));
}

export interface EntregaMotorista {
  id: string;
  numero: string;
  clienteNome: string;
  endereco: string;
  cep: string;
  valor: string;
  formaPagamento: FormaPagamento;
  status: StatusEntrega;
  horaSaida: string | null;
  clienteAssinouEm: string | null;
}

export interface EntregaHistoricoMotorista extends EntregaMotorista {
  data: string;
}

export async function getHistoricoDoMotorista(
  motoboyId: string,
  limit = 20
): Promise<EntregaHistoricoMotorista[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: entregas.id,
      numero: entregas.numero,
      data: entregas.data,
      clienteNome: entregas.clienteNome,
      endereco: entregas.endereco,
      cep: entregas.cep,
      valorPagamento: entregas.valorPagamento,
      formaPagamento: entregas.formaPagamento,
      status: entregas.status,
      horaSaida: entregas.horaSaida,
      clienteAssinouEm: entregas.clienteAssinouEm,
    })
    .from(entregas)
    .where(
      and(
        eq(entregas.motoboyId, motoboyId),
        eq(entregas.status, "entregue")
      )
    )
    .orderBy(desc(entregas.data), desc(entregas.numero))
    .limit(limit);

  return rows.map((entrega) => ({
    id: entrega.id,
    numero: `#${entrega.numero}`,
    data: formatDateBR(entrega.data),
    clienteNome: entrega.clienteNome,
    endereco: entrega.endereco ?? "",
    cep: entrega.cep ? formatCep(entrega.cep) : "",
    valor: formatBRL(Number(entrega.valorPagamento)),
    formaPagamento: entrega.formaPagamento,
    status: entrega.status,
    horaSaida: entrega.horaSaida,
    clienteAssinouEm: entrega.clienteAssinouEm,
  }));
}

export async function getEntregasDoMotorista(
  motoboyId: string
): Promise<EntregaMotorista[]> {
  const db = getDb();
  if (!db) return [];

  const hoje = paraChaveDiaLocal(new Date());

  const rows = await db
    .select({
      id: entregas.id,
      numero: entregas.numero,
      clienteNome: entregas.clienteNome,
      endereco: entregas.endereco,
      cep: entregas.cep,
      valorPagamento: entregas.valorPagamento,
      formaPagamento: entregas.formaPagamento,
      status: entregas.status,
      horaSaida: entregas.horaSaida,
      clienteAssinouEm: entregas.clienteAssinouEm,
    })
    .from(entregas)
    .where(
      and(
        eq(entregas.motoboyId, motoboyId),
        eq(entregas.data, hoje),
        ne(entregas.status, "cancelado")
      )
    )
    .orderBy(asc(entregas.numero));

  return rows.map((entrega) => ({
    id: entrega.id,
    numero: `#${entrega.numero}`,
    clienteNome: entrega.clienteNome,
    endereco: entrega.endereco ?? "",
    cep: entrega.cep ? formatCep(entrega.cep) : "",
    valor: formatBRL(Number(entrega.valorPagamento)),
    formaPagamento: entrega.formaPagamento,
    status: entrega.status,
    horaSaida: entrega.horaSaida,
    clienteAssinouEm: entrega.clienteAssinouEm,
  }));
}
