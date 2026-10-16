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
  sql,
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

// setorId: undefined = Admin (tudo); null = sem acesso (nada); uuid = só
// entregas desse setor. Mesmo contrato de getDashboardStats.
export async function getMotoristasEmRota(
  setorId?: string | null
): Promise<MotoristaEmRota[]> {
  const db = getDb();
  if (!db) return [];
  if (setorId === null) return [];

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
        eq(motoboys.ativo, true),
        setorId ? eq(entregas.setorId, setorId) : undefined
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

// setorId: undefined = não filtra (Admin, vê tudo). null = gestor_setor
// sem setor cadastrado, não vê nada. uuid = filtra por esse setor (ver
// @/lib/sessao-operador).
export async function getDashboardStats(
  setorId?: string | null
): Promise<DashboardStats> {
  const db = getDb();
  if (!db) {
    return {
      totalEntregas: 0,
      entregues: 0,
      pendentes: 0,
      motoristasAtivos: 0,
    };
  }

  if (setorId === null) {
    return { totalEntregas: 0, entregues: 0, pendentes: 0, motoristasAtivos: 0 };
  }

  const filtroSetor = setorId ? eq(entregas.setorId, setorId) : undefined;

  const [total, entregues, pendentes, motoristasAtivos] = await Promise.all([
    db.select({ total: count() }).from(entregas).where(filtroSetor),
    db
      .select({ total: count() })
      .from(entregas)
      .where(
        filtroSetor
          ? and(eq(entregas.status, "entregue"), filtroSetor)
          : eq(entregas.status, "entregue")
      ),
    db
      .select({ total: count() })
      .from(entregas)
      .where(
        filtroSetor
          ? and(eq(entregas.status, "pendente"), filtroSetor)
          : eq(entregas.status, "pendente")
      ),
    // Motoboys não têm setor no modelo atual — a contagem de motoristas
    // ativos continua global mesmo pra um gestor_setor logado.
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

export async function getEntregasPorDia(
  dias = 7,
  setorId?: string | null
): Promise<EntregaPorDia[]> {
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
  if (db && setorId !== null) {
    const rows = await db
      .select({ data: entregas.data })
      .from(entregas)
      .where(
        and(
          gte(entregas.data, paraChaveDiaLocal(inicio)),
          lte(entregas.data, paraChaveDiaLocal(hoje)),
          setorId ? eq(entregas.setorId, setorId) : undefined
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

export async function getAlertas(setorId?: string | null): Promise<Alerta[]> {
  const db = getDb();
  if (!db) return [];
  if (setorId === null) return [];
  const filtroSetor = setorId ? eq(entregas.setorId, setorId) : undefined;

  const [aguardandoSaida, semNfe] = await Promise.all([
    db
      .select({ total: count() })
      .from(entregas)
      .where(
        and(
          eq(entregas.status, "pendente"),
          isNull(entregas.horaSaida),
          filtroSetor
        )
      ),
    db
      .select({ total: count() })
      .from(entregas)
      .where(and(isNull(entregas.numeroNfe), filtroSetor)),
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
  limit = 4,
  setorId?: string | null
): Promise<AtividadeItem[]> {
  const db = getDb();
  if (!db) return [];
  if (setorId === null) return [];
  const filtroSetor = setorId ? eq(entregas.setorId, setorId) : undefined;

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
      .where(filtroSetor)
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
      .where(
        and(
          // Linhas de auditoria (só dados alterados, mesmo status) não são
          // "cliente confirmou"/"cancelada" — ficam fora do feed.
          sql`${entregaHistorico.statusAnterior} is distinct from ${entregaHistorico.statusNovo}`,
          filtroSetor
        )
      )
      .orderBy(desc(entregaHistorico.alteradoEm))
      .limit(limit),
  ]);

  const itens: AtividadeItem[] = [];

  for (const entrega of cadastros) {
    const responsavel =
      entrega.cadastradoPorNome ??
      (entrega.cadastradoPorAdminEmail ? "Administrador" : "Alguém");

    itens.push({
      id: `cadastro-${entrega.id}`,
      hora: formatHora(entrega.criadoEm),
      titulo: "Entrega registrada",
      descricao: `${responsavel} cadastrou a entrega #${entrega.numero} para ${entrega.clienteNome}.`,
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
  status: StatusEntrega;
}

export async function getEntregas(
  status?: StatusEntrega,
  setorId?: string | null
): Promise<EntregaListItem[]> {
  const db = getDb();
  if (!db) return [];
  if (setorId === null) return [];

  const filtros = [
    status ? eq(entregas.status, status) : undefined,
    setorId ? eq(entregas.setorId, setorId) : undefined,
  ].filter((f): f is NonNullable<typeof f> => f !== undefined);

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
    })
    .from(entregas)
    .leftJoin(motoboys, eq(entregas.motoboyId, motoboys.id))
    .where(filtros.length > 0 ? and(...filtros) : undefined)
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
    status: entrega.status,
  }));
}

export interface RelatorioFiltros {
  dataInicio?: string;
  dataFim?: string;
  status?: StatusEntrega;
  formaPagamento?: FormaPagamento;
  // undefined = Admin (tudo); null = sem acesso (vazio); uuid = só o setor.
  setorId?: string | null;
}

interface RelatorioEntregaItem {
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

interface RelatorioPorFormaPagamento {
  formaPagamento: FormaPagamento;
  quantidade: number;
  valor: string;
}

interface RelatorioTotais {
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
  if (filtros.setorId === null) return relatorioVazio();

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
          : undefined,
        filtros.setorId ? eq(entregas.setorId, filtros.setorId) : undefined
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
  latitude: number | null;
  longitude: number | null;
  numeroPedido: string;
  numeroNfe: string;
  valorPagamento: string;
  formaPagamento: FormaPagamento;
  motoboyId: string;
  motoboyNome: string;
  // "HH:MM:SS" (coluna time) ou null se o motorista ainda não saiu pra
  // entrega — exibido em destaque na tela de detalhe (ver canhotos/[id]).
  horaSaida: string | null;
  observacoes: string;
  status: StatusEntrega;
  setorId: string | null;
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
      latitude: entregas.latitude,
      longitude: entregas.longitude,
      numeroPedido: entregas.numeroPedido,
      numeroNfe: entregas.numeroNfe,
      valorPagamento: entregas.valorPagamento,
      formaPagamento: entregas.formaPagamento,
      horaSaida: entregas.horaSaida,
      observacoes: entregas.observacoes,
      status: entregas.status,
      motoboyId: entregas.motoboyId,
      motoboyNome: motoboys.nome,
      setorId: entregas.setorId,
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
    latitude:
      entrega.latitude === null ? null : Number(entrega.latitude),
    longitude:
      entrega.longitude === null ? null : Number(entrega.longitude),
    numeroPedido: entrega.numeroPedido ?? "",
    numeroNfe: entrega.numeroNfe ?? "",
    valorPagamento: String(entrega.valorPagamento),
    formaPagamento: entrega.formaPagamento,
    motoboyId: entrega.motoboyId ?? "",
    motoboyNome: entrega.motoboyNome ?? "",
    horaSaida: entrega.horaSaida,
    observacoes: entrega.observacoes ?? "",
    status: entrega.status,
    setorId: entrega.setorId,
  };
}

export interface EntregaComprovante {
  id: string;
  tipo: "foto" | "comprovante_pix" | "assinatura_cliente";
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
        anexo.tipo === "foto" ||
        anexo.tipo === "comprovante_pix" ||
        anexo.tipo === "assinatura_cliente"
    )
    .map((anexo) => ({
      id: anexo.id,
      tipo: anexo.tipo as
        | "foto"
        | "comprovante_pix"
        | "assinatura_cliente",
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

export interface HistoricoEntregaItem {
  id: string;
  alteradoEm: string;
  responsavel: string;
  statusAnterior: StatusEntrega | null;
  statusNovo: StatusEntrega;
  observacao: string | null;
}

export async function getHistoricoEntrega(
  entregaId: string
): Promise<HistoricoEntregaItem[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: entregaHistorico.id,
      alteradoEm: entregaHistorico.alteradoEm,
      statusAnterior: entregaHistorico.statusAnterior,
      statusNovo: entregaHistorico.statusNovo,
      observacao: entregaHistorico.observacao,
      colaboradorNome: colaboradores.nome,
      motoboyNome: motoboys.nome,
      adminId: entregaHistorico.alteradoPorAdmin,
    })
    .from(entregaHistorico)
    .leftJoin(colaboradores, eq(entregaHistorico.alteradoPor, colaboradores.id))
    .leftJoin(motoboys, eq(entregaHistorico.alteradoPorMotoboy, motoboys.id))
    .where(eq(entregaHistorico.entregaId, entregaId))
    .orderBy(desc(entregaHistorico.alteradoEm));

  return rows.map((linha) => ({
    id: linha.id,
    alteradoEm: linha.alteradoEm,
    responsavel:
      linha.colaboradorNome ??
      (linha.motoboyNome
        ? `${linha.motoboyNome} (motorista)`
        : linha.adminId
          ? "Administrador"
          : "Sistema"),
    statusAnterior: linha.statusAnterior,
    statusNovo: linha.statusNovo,
    observacao: linha.observacao,
  }));
}
