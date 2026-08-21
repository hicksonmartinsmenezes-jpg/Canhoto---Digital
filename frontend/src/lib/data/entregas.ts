// Camada de acesso a dados reais de Entregas (Supabase) — substitui os
// mocks de `@/lib/dashboard-mock` e `@/lib/canhotos-mock` no Dashboard e na
// tela de Entregas. Ver claude/modelo-de-dados-site.md para o schema.
//
// Enquanto o projeto Supabase não estiver criado/configurado (variáveis de
// ambiente ausentes), `createAdminClient()` devolve `null` e todas as
// funções aqui devolvem o mesmo resultado "vazio" que um banco real ainda
// sem dados devolveria — a UI já foi construída para lidar com isso.

import { createAdminClient } from "@/lib/supabase/admin";
import { formatBRL, formatDateBR } from "@/lib/format";
import type { FormaPagamento, StatusEntrega } from "@/types/database";

// pt-BR: garante o formato "AAAA-MM-DD" que os inputs <input type="date">
// esperam, independente de fuso.
function paraDataInput(dataIso: string): string {
  return dataIso.slice(0, 10);
}

export interface DashboardStats {
  totalEntregas: number;
  entregues: number;
  pendentes: number;
  motoristasAtivos: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { totalEntregas: 0, entregues: 0, pendentes: 0, motoristasAtivos: 0 };
  }

  const [total, entregues, pendentes, motoristasAtivos] = await Promise.all([
    supabase.from("entregas").select("*", { count: "exact", head: true }),
    supabase
      .from("entregas")
      .select("*", { count: "exact", head: true })
      .eq("status", "entregue"),
    supabase
      .from("entregas")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente"),
    supabase
      .from("motoboys")
      .select("*", { count: "exact", head: true })
      .eq("ativo", true),
  ]);

  return {
    totalEntregas: total.count ?? 0,
    entregues: entregues.count ?? 0,
    pendentes: pendentes.count ?? 0,
    motoristasAtivos: motoristasAtivos.count ?? 0,
  };
}

export interface EntregaPorDia {
  dataIso: string;
  dataFormatada: string;
  total: number;
}

// Chave "AAAA-MM-DD" em horário local — não usa `toISOString()` (que
// converte pra UTC e pode empurrar a data pro dia errado perto da meia-noite,
// dependendo do fuso do servidor).
function paraChaveDiaLocal(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// Gráfico "Entregas por dia" do Dashboard (Issue #25) — série dos últimos
// `dias` dias, com todo dia presente mesmo sem nenhuma entrega (aparece como
// 0 em vez de sumir, senão a leitura visual da tendência fica distorcida).
// Sem GROUP BY no Postgres/PostgREST: busca as datas do período e agrega em
// JS — mais simples que criar uma view só pra isso, e o volume de linhas do
// admin interno não justifica a otimização (ver princípio "evitar
// overengineering" em AGENTS.md).
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

  const supabase = createAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("entregas")
      .select("data")
      .gte("data", paraChaveDiaLocal(inicio))
      .lte("data", paraChaveDiaLocal(hoje));

    if (!error && data) {
      for (const e of data) {
        const chave = e.data.slice(0, 10);
        if (porDia.has(chave)) {
          porDia.set(chave, (porDia.get(chave) ?? 0) + 1);
        }
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

export async function getEntregasRecentes(limit = 5): Promise<EntregaRecente[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("entregas")
    .select("numero, cliente_nome, valor_pagamento, forma_pagamento, data, status")
    .order("criado_em", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((e) => ({
    numero: `#${e.numero}`,
    cliente: e.cliente_nome,
    valor: formatBRL(Number(e.valor_pagamento)),
    formaPagamento: e.forma_pagamento,
    data: formatDateBR(e.data),
    status: e.status,
  }));
}

export interface Alerta {
  id: string;
  tag: string;
  titulo: string;
  descricao: string;
  tom: "critico" | "atencao" | "info";
  /** Quando presente, o card do alerta vira um link — usado pelo alerta de
   * conferência de caixa (Issue #9) pra levar direto pra lista de Entregas,
   * onde a ação "Conferir" fica disponível em cada linha pendente. */
  href?: string;
}

function pluralEntregas(n: number): string {
  return n === 1 ? "1 entrega" : `${n} entregas`;
}

export async function getAlertas(): Promise<Alerta[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  // Nota: o alerta de "conferência de caixa" (Issue #9) foi pausado aqui de
  // propósito — a logística de comprovação de pagamento ficou fora de
  // escopo por enquanto (decisão de 21/08/2026). A view
  // `entregas_pendentes_conferencia` e a Server Action `conferirCaixa`
  // continuam intactas no banco/backend, só não são mais consultadas/
  // mostradas nesta função. O foco passa a ser só o status da entrega
  // (pendente → entregue/cancelado).
  const [aguardandoSaida, semNfe] = await Promise.all([
    supabase
      .from("entregas")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente")
      .is("hora_saida", null),
    supabase
      .from("entregas")
      .select("*", { count: "exact", head: true })
      .is("numero_nfe", null),
  ]);

  const alertas: Alerta[] = [];

  if ((aguardandoSaida.count ?? 0) > 0) {
    alertas.push({
      id: "aguardando-saida",
      tag: "SAÍDA",
      titulo: `${pluralEntregas(aguardandoSaida.count!)} aguardando saída`,
      descricao: "Cadastradas no sistema, mas o motorista ainda não saiu para entrega.",
      tom: "atencao",
    });
  }

  if ((semNfe.count ?? 0) > 0) {
    alertas.push({
      id: "sem-nfe",
      tag: "CADASTRO",
      titulo: `${pluralEntregas(semNfe.count!)} sem número de NF-e`,
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

// Feed de atividade real, montado a partir de duas fontes:
// 1. Cadastro de novas entregas (`entregas.criado_em`).
// 2. Mudanças de status (`entrega_historico`, gravado automaticamente por
//    trigger quando `entregas.status` muda).
// Nota: hoje não existe uma trilha própria para "motorista saiu" (grava só
// `hora_saida`, sem mudar status) nem "pagamento conferido no caixa" (grava
// `caixa_confirmou_em`, também sem mudar status) — esses dois eventos não
// aparecem aqui ainda. Se fizer sentido mostrá-los, precisamos de um
// trigger adicional gravando em `entrega_historico` nesses updates também.
export async function getAtividadeRecente(limit = 4): Promise<AtividadeItem[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const [cadastros, mudancasStatus] = await Promise.all([
    supabase
      .from("entregas")
      .select(
        "id, numero, cliente_nome, criado_em, cadastrado_por:colaboradores!cadastrado_por(nome)"
      )
      .order("criado_em", { ascending: false })
      .limit(limit),
    supabase
      .from("entrega_historico")
      .select("id, status_novo, alterado_em, entregas(numero)")
      .order("alterado_em", { ascending: false })
      .limit(limit),
  ]);

  const itens: AtividadeItem[] = [];

  for (const e of cadastros.data ?? []) {
    const cadastradoPor = Array.isArray(e.cadastrado_por)
      ? e.cadastrado_por[0]
      : e.cadastrado_por;
    itens.push({
      id: `cadastro-${e.id}`,
      hora: formatHora(e.criado_em),
      titulo: "Entrega registrada",
      descricao: `${cadastradoPor?.nome ?? "Alguém"} cadastrou a entrega #${e.numero} (${e.cliente_nome}).`,
      cor: "primary",
      timestamp: e.criado_em,
    });
  }

  for (const h of mudancasStatus.data ?? []) {
    const entrega = Array.isArray(h.entregas) ? h.entregas[0] : h.entregas;
    const numero = entrega?.numero ?? "?";
    if (h.status_novo === "entregue") {
      itens.push({
        id: `historico-${h.id}`,
        hora: formatHora(h.alterado_em),
        titulo: "Entrega confirmada pelo cliente",
        descricao: `Cliente confirmou o recebimento da entrega #${numero}.`,
        cor: "info",
        timestamp: h.alterado_em,
      });
    } else if (h.status_novo === "cancelado") {
      itens.push({
        id: `historico-${h.id}`,
        hora: formatHora(h.alterado_em),
        titulo: "Entrega cancelada",
        descricao: `A entrega #${numero} foi marcada como cancelada.`,
        cor: "muted",
        timestamp: h.alterado_em,
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
  /** Espelha a condição da view `entregas_pendentes_conferencia` (ver
   * claude/modelo-de-dados-site.md): entrega já entregue, com pagamento
   * recebido na hora (não "prazo") e que ainda não tem `caixa_id` — mostra
   * a ação "Conferir" na tabela (Issue #9). */
  pendenteConferencia: boolean;
}

// `status`: filtro opcional do select "Filtrar situação" da tela de
// Entregas (Issue #7) — quando ausente, devolve todas as entregas como
// antes.
export async function getEntregas(
  status?: StatusEntrega
): Promise<EntregaListItem[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  let query = supabase
    .from("entregas")
    .select(
      `id, numero, data, cliente_nome, numero_pedido, numero_nfe, valor_pagamento,
       forma_pagamento, status,
       motoboy:motoboys!motoboy_id ( nome ),
       caixa:colaboradores!caixa_id ( nome )`
    );

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("numero", { ascending: false });

  if (error || !data) return [];

  return data.map((e) => {
    const motoboy = Array.isArray(e.motoboy) ? e.motoboy[0] : e.motoboy;
    const caixa = Array.isArray(e.caixa) ? e.caixa[0] : e.caixa;
    return {
      id: e.id,
      numero: `#${e.numero}`,
      data: formatDateBR(e.data),
      cliente: e.cliente_nome,
      numeroPedido: e.numero_pedido,
      numeroNfe: e.numero_nfe,
      valor: formatBRL(Number(e.valor_pagamento)),
      formaPagamento: e.forma_pagamento,
      motoboy: motoboy?.nome ?? null,
      caixa: caixa?.nome ?? null,
      status: e.status,
      pendenteConferencia:
        e.status === "entregue" &&
        e.forma_pagamento !== "prazo" &&
        caixa === null,
    };
  });
}

export interface EntregaDetalhe {
  id: string;
  numero: number;
  data: string;
  clienteNome: string;
  clienteTelefone: string;
  endereco: string;
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
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("entregas")
    .select(
      `id, numero, data, cliente_nome, cliente_telefone, endereco, numero_pedido, numero_nfe,
       valor_pagamento, forma_pagamento, observacoes, status, motoboy_id,
       motoboy:motoboys!motoboy_id ( nome )`
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const motoboy = Array.isArray(data.motoboy) ? data.motoboy[0] : data.motoboy;

  return {
    id: data.id,
    numero: data.numero,
    data: paraDataInput(data.data),
    clienteNome: data.cliente_nome,
    clienteTelefone: data.cliente_telefone ?? "",
    endereco: data.endereco ?? "",
    numeroPedido: data.numero_pedido ?? "",
    numeroNfe: data.numero_nfe ?? "",
    valorPagamento: String(data.valor_pagamento),
    formaPagamento: data.forma_pagamento,
    motoboyId: data.motoboy_id ?? "",
    motoboyNome: motoboy?.nome ?? "",
    observacoes: data.observacoes ?? "",
    status: data.status,
  };
}

export interface EntregaMotorista {
  id: string;
  numero: string;
  clienteNome: string;
  endereco: string;
  valor: string;
  formaPagamento: FormaPagamento;
  status: StatusEntrega;
  horaSaida: string | null;
  clienteAssinouEm: string | null;
}

// Lista de entregas do dia pro motorista logado (app do motorista, Issue
// #5, sub-issue #30) — só as de hoje e nunca as canceladas (não fazem
// parte do que ele precisa agir). "Em rota" não é um status próprio:
// continua sendo `status === "pendente" && hora_saida !== null`, calculado
// aqui do mesmo jeito que em getAlertas — ver claude/ideias-decisoes-projeto.md.
// `motoboyId` sempre vem do cookie de sessão (@/lib/motorista-session),
// nunca de um param vindo do client — é o que garante que um motorista só
// vê as próprias entregas.
export async function getEntregasDoMotorista(
  motoboyId: string
): Promise<EntregaMotorista[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const hoje = paraChaveDiaLocal(new Date());

  const { data, error } = await supabase
    .from("entregas")
    .select(
      "id, numero, cliente_nome, endereco, valor_pagamento, forma_pagamento, status, hora_saida, cliente_assinou_em"
    )
    .eq("motoboy_id", motoboyId)
    .eq("data", hoje)
    .neq("status", "cancelado")
    .order("numero", { ascending: true });

  if (error || !data) return [];

  return data.map((e) => ({
    id: e.id,
    numero: `#${e.numero}`,
    clienteNome: e.cliente_nome,
    endereco: e.endereco ?? "",
    valor: formatBRL(Number(e.valor_pagamento)),
    formaPagamento: e.forma_pagamento,
    status: e.status,
    horaSaida: e.hora_saida,
    clienteAssinouEm: e.cliente_assinou_em,
  }));
}
