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
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
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
  setores,
  usuariosAdmin,
} from "@/lib/db/schema";
import { formatBRL, formatCep, formatDateBR } from "@/lib/format";
import type { FormaPagamento, StatusEntrega } from "@/types/database";
import { situacaoEntrega, type SituacaoEntrega } from "@/lib/status";

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

  const hoje = paraChaveDiaLocal(new Date());
  const filtroSetor = setorId ? eq(entregas.setorId, setorId) : undefined;

  const [total, entregues, pendentes, motoristasAtivos] = await Promise.all([
    db
      .select({ total: count() })
      .from(entregas)
      .where(and(eq(entregas.data, hoje), filtroSetor)),
    db
      .select({ total: count() })
      .from(entregas)
      .where(
        and(
          eq(entregas.status, "entregue"),
          eq(entregas.data, hoje),
          filtroSetor
        )
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

  const [aguardandoSaida, aguardandoAntigas, semNfe] = await Promise.all([
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
    // Quantas dessas são de dias anteriores (esquecidas na fila).
    db
      .select({ total: count() })
      .from(entregas)
      .where(
        and(
          eq(entregas.status, "pendente"),
          isNull(entregas.horaSaida),
          lt(entregas.data, paraChaveDiaLocal(new Date())),
          filtroSetor
        )
      ),
    db
      .select({ total: count() })
      .from(entregas)
      .where(
        and(
          isNull(entregas.numeroNfe),
          eq(entregas.clienteFinal, false),
          ne(entregas.status, "cancelado"),
          filtroSetor
        )
      ),
  ]);

  const aguardandoSaidaTotal = aguardandoSaida[0]?.total ?? 0;
  const aguardandoAntigasTotal = aguardandoAntigas[0]?.total ?? 0;
  const semNfeTotal = semNfe[0]?.total ?? 0;
  const alertas: Alerta[] = [];

  if (aguardandoSaidaTotal > 0) {
    alertas.push({
      id: "aguardando-saida",
      tag: "SAÍDA",
      titulo: `${pluralEntregas(aguardandoSaidaTotal)} aguardando saída`,
      descricao:
        aguardandoAntigasTotal > 0
          ? `Inclui ${aguardandoAntigasTotal} de dias anteriores. Toque para ver todas.`
          : "Cadastradas no sistema, mas o motorista ainda não saiu para entrega.",
      tom: "atencao",
      // "de=&ate=" mostra todos os dias (sem isso a lista abre só no dia de hoje).
      href: "/canhotos?situacao=aguardando&de=&ate=",
    });
  }

  if (semNfeTotal > 0) {
    alertas.push({
      id: "sem-nfe",
      tag: "CADASTRO",
      titulo: `${pluralEntregas(semNfeTotal)} sem número de NF-e`,
      descricao: "Cadastro incompleto — dificulta a consulta depois.",
      tom: "info",
      href: "/canhotos?semNfe=1",
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
        observacao: entregaHistorico.observacao,
        numero: entregas.numero,
        motoristaNome: motoboys.nome,
      })
      .from(entregaHistorico)
      .innerJoin(entregas, eq(entregaHistorico.entregaId, entregas.id))
      // Quem concluiu: o motoboy que gravou a mudança; se não houver, o
      // motorista da entrega.
      .leftJoin(
        motoboys,
        eq(
          motoboys.id,
          sql`coalesce(${entregaHistorico.alteradoPorMotoboy}, ${entregas.motoboyId})`
        )
      )
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
      hora: rotuloQuando(entrega.criadoEm),
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
        hora: rotuloQuando(historico.alteradoEm),
        titulo: "Entrega concluída",
        descricao: `${historico.motoristaNome ? `O motorista ${historico.motoristaNome}` : "O motorista"} concluiu a entrega #${historico.numero} com foto da entrega.`,
        cor: "info",
        timestamp: historico.alteradoEm,
      });
    } else if (historico.statusNovo === "cancelado") {
      itens.push({
        id: `historico-${historico.id}`,
        hora: rotuloQuando(historico.alteradoEm),
        titulo: "Entrega cancelada",
        descricao: historico.observacao?.startsWith("Motivo do cancelamento:")
          ? `Entrega #${historico.numero} cancelada. ${historico.observacao}.`
          : `A entrega #${historico.numero} foi marcada como cancelada.`,
        cor: "muted",
        timestamp: historico.alteradoEm,
      });
    }
  }

  return itens
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

const FUSO_LOJA = "America/Sao_Paulo";

function diaNaLoja(data: Date): string {
  return data.toLocaleDateString("en-CA", { timeZone: FUSO_LOJA });
}

/**
 * "Hoje, 12:45" / "Ontem, 11:01" / "03/10, 09:30" — só a hora fazia itens de
 * ontem parecerem fora de ordem. Sempre no fuso da loja (o servidor pode
 * estar em UTC).
 */
export function rotuloQuando(isoTimestamp: string, agora = new Date()): string {
  const data = new Date(isoTimestamp);
  const hora = data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO_LOJA,
  });
  const dia = diaNaLoja(data);
  if (dia === diaNaLoja(agora)) return `Hoje, ${hora}`;
  const ontem = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
  if (dia === diaNaLoja(ontem)) return `Ontem, ${hora}`;
  const ddmm = data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: FUSO_LOJA,
  });
  return `${ddmm}, ${hora}`;
}

export interface EntregaListItem {
  id: string;
  numero: string;
  data: string;
  cliente: string;
  numeroPedido: string | null;
  numeroNfe: string | null;
  /** Venda a consumidor final (sem NF-e). */
  clienteFinal: boolean;
  valor: string;
  formaPagamento: FormaPagamento;
  motoboy: string | null;
  status: StatusEntrega;
  situacao: SituacaoEntrega;
  /** Ainda na loja (pendente e sem saída): pode excluir ou cancelar. */
  aindaNaLoja: boolean;
}

/** Cliente, NF-e, pedido, telefone ou número da entrega (#123). */
function condicaoBusca(buscaBruta: string | undefined) {
  const busca = buscaBruta?.trim();
  if (!busca) return undefined;

  const padrao = `%${escaparLike(busca)}%`;
  const numero = /^#?\d{1,9}$/.test(busca) ? Number(busca.replace("#", "")) : null;
  const digitos = busca.replace(/\D/g, "");
  const opcoes = [
    sql`${entregas.clienteNome} ilike ${padrao}`,
    sql`${entregas.numeroNfe} ilike ${padrao}`,
    sql`${entregas.numeroPedido} ilike ${padrao}`,
  ];
  if (numero !== null) opcoes.push(eq(entregas.numero, numero));
  if (digitos.length >= 4) {
    opcoes.push(sql`${entregas.clienteTelefone} like ${`%${digitos}%`}`);
  }
  return or(...opcoes);
}

export interface FiltrosListaEntregas {
  situacao?: SituacaoEntrega;
  /** Só entregas abertas (pendentes e em rota), quando não há situação escolhida. */
  somenteEmAberto?: boolean;
  /** Cliente, NF-e, pedido, telefone ou número da entrega (#123). */
  busca?: string;
  dataInicio?: string;
  dataFim?: string;
  motoboyId?: string;
  /**
   * Só entregas sem número de NF-e e não canceladas — mesmo critério do alerta
   * "sem número de NF-e" do Dashboard (canceladas e vendas a consumidor final
   * não precisam de nota).
   */
  semNfe?: boolean;
}

/** Sem paginação ainda: a lista mostra as mais recentes e a busca acha o resto. */
export const LIMITE_LISTA_ENTREGAS = 300;

function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function getEntregas(
  filtros: FiltrosListaEntregas = {},
  setorId?: string | null
): Promise<EntregaListItem[]> {
  const db = getDb();
  if (!db) return [];
  if (setorId === null) return [];

  const condicoes = [];
  switch (filtros.situacao) {
    case "aguardando":
      condicoes.push(eq(entregas.status, "pendente"), isNull(entregas.horaSaida));
      break;
    case "em_rota":
      condicoes.push(eq(entregas.status, "pendente"), isNotNull(entregas.horaSaida));
      break;
    case "entregue":
    case "cancelado":
      condicoes.push(eq(entregas.status, filtros.situacao));
      break;
    default:
      if (filtros.somenteEmAberto) condicoes.push(eq(entregas.status, "pendente"));
  }
  if (setorId) condicoes.push(eq(entregas.setorId, setorId));
  if (filtros.dataInicio) condicoes.push(gte(entregas.data, filtros.dataInicio));
  if (filtros.dataFim) condicoes.push(lte(entregas.data, filtros.dataFim));
  if (filtros.motoboyId) condicoes.push(eq(entregas.motoboyId, filtros.motoboyId));
  if (filtros.semNfe) {
    condicoes.push(
      isNull(entregas.numeroNfe),
      eq(entregas.clienteFinal, false),
      ne(entregas.status, "cancelado")
    );
  }

  const condicaoDaBusca = condicaoBusca(filtros.busca);
  if (condicaoDaBusca) condicoes.push(condicaoDaBusca);

  const rows = await db
    .select({
      id: entregas.id,
      numero: entregas.numero,
      data: entregas.data,
      clienteNome: entregas.clienteNome,
      numeroPedido: entregas.numeroPedido,
      numeroNfe: entregas.numeroNfe,
      clienteFinal: entregas.clienteFinal,
      valorPagamento: entregas.valorPagamento,
      formaPagamento: entregas.formaPagamento,
      status: entregas.status,
      horaSaida: entregas.horaSaida,
      motoboyNome: motoboys.nome,
    })
    .from(entregas)
    .leftJoin(motoboys, eq(entregas.motoboyId, motoboys.id))
    .where(condicoes.length > 0 ? and(...condicoes) : undefined)
    .orderBy(desc(entregas.numero))
    .limit(LIMITE_LISTA_ENTREGAS);

  return rows.map((entrega) => ({
    id: entrega.id,
    numero: `#${entrega.numero}`,
    data: formatDateBR(entrega.data),
    cliente: entrega.clienteNome,
    numeroPedido: entrega.numeroPedido,
    numeroNfe: entrega.numeroNfe,
    clienteFinal: entrega.clienteFinal,
    valor: formatBRL(Number(entrega.valorPagamento)),
    formaPagamento: entrega.formaPagamento,
    motoboy: entrega.motoboyNome,
    status: entrega.status,
    situacao: situacaoEntrega(entrega.status, entrega.horaSaida),
    aindaNaLoja: entrega.status === "pendente" && entrega.horaSaida === null,
  }));
}

export interface RelatorioFiltros {
  dataInicio?: string;
  dataFim?: string;
  status?: StatusEntrega;
  formaPagamento?: FormaPagamento;
  motoboyId?: string;
  /** Cliente, NF-e, pedido, telefone ou número da entrega (#123). */
  busca?: string;
  /** Só entregas desta unidade (Matriz ou Distribuidora). */
  unidadeId?: string;
  // undefined = Admin (tudo); null = sem acesso (vazio); uuid = só o setor.
  setorId?: string | null;
}

interface RelatorioEntregaItem {
  id: string;
  numero: string;
  data: string;
  cliente: string;
  telefone: string | null;
  endereco: string | null;
  numeroNfe: string | null;
  numeroPedido: string | null;
  valor: string;
  valorNumerico: number;
  formaPagamento: FormaPagamento;
  motoboy: string | null;
  /** Unidade de origem (Matriz, Distribuidora…) ou null. */
  unidade: string | null;
  status: StatusEntrega;
  situacao: SituacaoEntrega;
  /** "HH:MM" ou null. */
  horaSaida: string | null;
  /** "dd/mm/aaaa HH:MM" (fuso da loja) ou null. */
  concluidaEm: string | null;
}

interface RelatorioPorFormaPagamento {
  formaPagamento: FormaPagamento;
  quantidade: number;
  valor: string;
}

interface RelatorioTotais {
  quantidade: number;
  entregues: number;
  canceladas: number;
  /** Soma das entregas NÃO canceladas (canceladas não entram no caixa). */
  valorTotal: string;
  /** Soma só das entregues. */
  valorEntregue: string;
  /** Média das NÃO canceladas. */
  ticketMedio: string;
  /** Por forma de pagamento, sem canceladas. */
  porFormaPagamento: RelatorioPorFormaPagamento[];
}

export interface RelatorioEntregas {
  itens: RelatorioEntregaItem[];
  totais: RelatorioTotais;
}

function relatorioVazio(): RelatorioEntregas {
  return {
    itens: [],
    totais: calcularTotaisRelatorio([]),
  };
}

function formatarDataHoraLoja(iso: string | null): string | null {
  if (!iso) return null;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return null;
  return data
    .toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", "");
}

/** Totais do relatório: entregas canceladas contam na quantidade, mas não no dinheiro. */
export function calcularTotaisRelatorio(
  itens: Pick<RelatorioEntregaItem, "status" | "valorNumerico" | "formaPagamento">[]
): RelatorioTotais {
  const validas = itens.filter((item) => item.status !== "cancelado");
  const entregues = itens.filter((item) => item.status === "entregue");
  const soma = (lista: typeof itens) =>
    lista.reduce((total, item) => total + item.valorNumerico, 0);
  const valorValidas = soma(validas);

  const porFormaMapa = new Map<FormaPagamento, { quantidade: number; valor: number }>();
  for (const item of validas) {
    const atual = porFormaMapa.get(item.formaPagamento) ?? { quantidade: 0, valor: 0 };
    atual.quantidade += 1;
    atual.valor += item.valorNumerico;
    porFormaMapa.set(item.formaPagamento, atual);
  }

  return {
    quantidade: itens.length,
    entregues: entregues.length,
    canceladas: itens.length - validas.length,
    valorTotal: formatBRL(valorValidas),
    valorEntregue: formatBRL(soma(entregues)),
    ticketMedio: formatBRL(validas.length > 0 ? valorValidas / validas.length : 0),
    porFormaPagamento: Array.from(porFormaMapa.entries())
      .map(([formaPagamento, valor]) => ({
        formaPagamento,
        quantidade: valor.quantidade,
        valor: formatBRL(valor.valor),
      }))
      .sort((a, b) => b.quantidade - a.quantidade),
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
      clienteTelefone: entregas.clienteTelefone,
      endereco: entregas.endereco,
      numeroNfe: entregas.numeroNfe,
      numeroPedido: entregas.numeroPedido,
      valorPagamento: entregas.valorPagamento,
      formaPagamento: entregas.formaPagamento,
      status: entregas.status,
      horaSaida: entregas.horaSaida,
      clienteAssinouEm: entregas.clienteAssinouEm,
      motoboyNome: motoboys.nome,
      unidadeNome: setores.nome,
    })
    .from(entregas)
    .leftJoin(motoboys, eq(entregas.motoboyId, motoboys.id))
    .leftJoin(setores, eq(entregas.setorId, setores.id))
    .where(
      and(
        filtros.dataInicio
          ? gte(entregas.data, filtros.dataInicio)
          : undefined,
        filtros.dataFim ? lte(entregas.data, filtros.dataFim) : undefined,
        // Relatórios mostram só o que terminou (entregue ou cancelado); o
        // que está em aberto fica na tela Entregas.
        filtros.status === "entregue" || filtros.status === "cancelado"
          ? eq(entregas.status, filtros.status)
          : inArray(entregas.status, ["entregue", "cancelado"]),
        filtros.formaPagamento
          ? eq(entregas.formaPagamento, filtros.formaPagamento)
          : undefined,
        filtros.motoboyId ? eq(entregas.motoboyId, filtros.motoboyId) : undefined,
        filtros.setorId ? eq(entregas.setorId, filtros.setorId) : undefined,
        filtros.unidadeId ? eq(entregas.setorId, filtros.unidadeId) : undefined,
        condicaoBusca(filtros.busca)
      )
    )
    .orderBy(desc(entregas.data), desc(entregas.numero));

  const itens: RelatorioEntregaItem[] = rows.map((entrega) => ({
    id: entrega.id,
    numero: `#${entrega.numero}`,
    data: formatDateBR(entrega.data),
    cliente: entrega.clienteNome,
    telefone: entrega.clienteTelefone,
    endereco: entrega.endereco,
    numeroNfe: entrega.numeroNfe,
    numeroPedido: entrega.numeroPedido,
    valor: formatBRL(Number(entrega.valorPagamento)),
    valorNumerico: Number(entrega.valorPagamento),
    formaPagamento: entrega.formaPagamento,
    motoboy: entrega.motoboyNome,
    unidade: entrega.unidadeNome,
    status: entrega.status,
    situacao: situacaoEntrega(entrega.status, entrega.horaSaida),
    horaSaida: entrega.horaSaida ? entrega.horaSaida.slice(0, 5) : null,
    concluidaEm:
      entrega.status === "entregue"
        ? formatarDataHoraLoja(entrega.clienteAssinouEm)
        : null,
  }));

  return { itens, totais: calcularTotaisRelatorio(itens) };
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
  /** Venda a consumidor final (sem NF-e). */
  clienteFinal: boolean;
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
      clienteFinal: entregas.clienteFinal,
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
    clienteFinal: entrega.clienteFinal,
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
  tipo: "foto" | "foto_produto" | "comprovante_pix" | "assinatura_cliente";
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
        anexo.tipo === "foto_produto" ||
        anexo.tipo === "comprovante_pix" ||
        anexo.tipo === "assinatura_cliente"
    )
    .map((anexo) => ({
      id: anexo.id,
      tipo: anexo.tipo as
        | "foto"
        | "foto_produto"
        | "comprovante_pix"
        | "assinatura_cliente",
      capturadoEm: anexo.capturadoEm,
      capturadoPorMotoboy: anexo.motoboyNome ?? null,
    }));
}

export interface EntregaDocumento {
  id: string;
  tipo: "xml_nfe" | "xml_cte" | "danfe_pdf";
  capturadoEm: string;
}

/** XML e PDF da nota anexados no cadastro da entrega. */
export async function getDocumentosEntrega(
  entregaId: string
): Promise<EntregaDocumento[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: entregaAnexos.id,
      tipo: entregaAnexos.tipo,
      capturadoEm: entregaAnexos.capturadoEm,
    })
    .from(entregaAnexos)
    .where(eq(entregaAnexos.entregaId, entregaId))
    .orderBy(asc(entregaAnexos.capturadoEm));

  return rows.flatMap((anexo) =>
    anexo.tipo === "xml_nfe" ||
    anexo.tipo === "xml_cte" ||
    anexo.tipo === "danfe_pdf"
      ? [{ id: anexo.id, tipo: anexo.tipo, capturadoEm: anexo.capturadoEm }]
      : []
  );
}

export interface EntregaMotorista {
  id: string;
  numero: string;
  clienteNome: string;
  endereco: string;
  cep: string;
  valor: string;
  valorNumerico: number;
  formaPagamento: FormaPagamento;
  status: StatusEntrega;
  horaSaida: string | null;
  clienteAssinouEm: string | null;
}

/** Entrega do dia na lista do motorista: inclui o que a rota precisa. */
export interface EntregaMotoristaHoje extends EntregaMotorista {
  latitude: number | null;
  longitude: number | null;
  /** Entregas da mesma rota têm o mesmo rotaId (null = entrega solta). */
  rotaId: string | null;
  /** Posição na ordem de visita da rota (1 = primeira parada). */
  rotaOrdem: number | null;
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
    valorNumerico: Number(entrega.valorPagamento),
    formaPagamento: entrega.formaPagamento,
    status: entrega.status,
    horaSaida: entrega.horaSaida,
    clienteAssinouEm: entrega.clienteAssinouEm,
  }));
}

export async function getEntregasDoMotorista(
  motoboyId: string
): Promise<EntregaMotoristaHoje[]> {
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
      latitude: entregas.latitude,
      longitude: entregas.longitude,
      rotaId: entregas.rotaId,
      rotaOrdem: entregas.rotaOrdem,
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
    valorNumerico: Number(entrega.valorPagamento),
    formaPagamento: entrega.formaPagamento,
    status: entrega.status,
    horaSaida: entrega.horaSaida,
    clienteAssinouEm: entrega.clienteAssinouEm,
    latitude: entrega.latitude === null ? null : Number(entrega.latitude),
    longitude: entrega.longitude === null ? null : Number(entrega.longitude),
    rotaId: entrega.rotaId,
    rotaOrdem: entrega.rotaOrdem,
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

export interface ClienteRecente {
  nome: string;
  telefone: string | null;
  endereco: string | null;
  cep: string | null;
}

/**
 * Clientes das entregas mais recentes (sem repetir nome), para o cadastro de
 * entrega sugerir o nome e preencher telefone/endereço de quem já comprou.
 */
export async function getClientesRecentes(
  setorId?: string | null,
  limite = 300
): Promise<ClienteRecente[]> {
  const db = getDb();
  if (!db) return [];
  if (setorId === null) return [];

  const rows = await db
    .select({
      nome: entregas.clienteNome,
      telefone: entregas.clienteTelefone,
      endereco: entregas.endereco,
      cep: entregas.cep,
    })
    .from(entregas)
    .where(setorId ? eq(entregas.setorId, setorId) : undefined)
    .orderBy(desc(entregas.criadoEm))
    .limit(limite * 4);

  const vistos = new Set<string>();
  const clientes: ClienteRecente[] = [];
  for (const row of rows) {
    const chave = row.nome.trim().toLocaleLowerCase("pt-BR");
    if (!chave || vistos.has(chave)) continue;
    vistos.add(chave);
    clientes.push(row);
    if (clientes.length >= limite) break;
  }
  return clientes;
}
