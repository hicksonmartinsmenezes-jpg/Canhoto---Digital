// Dados de exemplo para o Dashboard — schema v2 (entrega ao cliente externo,
// baseado no romaneio real da Expedição). Ver claude/modelo-de-dados-site.md.
// Substituir por consultas reais ao Supabase quando as tabelas estiverem populadas.

import type { FormaPagamento, StatusEntrega } from "@/types/database";

export interface EntregaRecente {
  numero: string;
  cliente: string;
  valor: string;
  formaPagamento: FormaPagamento;
  data: string;
  status: StatusEntrega;
}

export const ENTREGAS_RECENTES: EntregaRecente[] = [
  {
    numero: "#1250",
    cliente: "TD Tech",
    valor: "R$ 57,22",
    formaPagamento: "prazo",
    data: "18/08/2026",
    status: "entregue",
  },
  {
    numero: "#1249",
    cliente: "Rowlson",
    valor: "R$ 322,72",
    formaPagamento: "pix",
    data: "18/08/2026",
    status: "pendente",
  },
  {
    numero: "#1248",
    cliente: "Robson Corretora",
    valor: "R$ 235,32",
    formaPagamento: "dinheiro",
    data: "17/08/2026",
    status: "entregue",
  },
  {
    numero: "#1247",
    cliente: "Automotic",
    valor: "R$ 143,38",
    formaPagamento: "debito",
    data: "17/08/2026",
    status: "entregue",
  },
  {
    numero: "#1246",
    cliente: "Jadilson Morais",
    valor: "R$ 52,59",
    formaPagamento: "pix",
    data: "16/08/2026",
    status: "cancelado",
  },
];

export interface StatusCount {
  status: StatusEntrega;
  label: string;
  value: number;
}

// value em cada status — soma usada para o gráfico de rosca do Dashboard.
export const ENTREGAS_POR_STATUS: StatusCount[] = [
  { status: "entregue", label: "Entregues", value: 1046 },
  { status: "pendente", label: "Pendentes", value: 156 },
  { status: "cancelado", label: "Cancelados", value: 46 },
];

export interface Alerta {
  id: string;
  tag: string;
  titulo: string;
  descricao: string;
  tom: "critico" | "atencao" | "info";
}

export const ALERTAS: Alerta[] = [
  {
    id: "conferencia-caixa",
    tag: "CAIXA",
    titulo: "7 Entregas Pendentes de Conferência de Caixa",
    descricao:
      "Pagamento recebido pelo motorista na entrega ainda não foi conferido pelo caixa.",
    tom: "critico",
  },
  {
    id: "aguardando-saida",
    tag: "SAÍDA",
    titulo: "23 entregas aguardando saída",
    descricao: "Cadastradas no sistema, mas o motorista ainda não saiu para entrega.",
    tom: "atencao",
  },
  {
    id: "sem-nfe",
    tag: "CADASTRO",
    titulo: "12 entregas sem número de NF-e",
    descricao: "Cadastro incompleto — dificulta a consulta depois.",
    tom: "info",
  },
];

export interface AtividadeItem {
  id: string;
  hora: string;
  titulo: string;
  descricao: string;
  cor: "primary" | "success" | "info" | "muted";
}

export const ATIVIDADE_RECENTE: AtividadeItem[] = [
  {
    id: "1",
    hora: "14:32",
    titulo: "Entrega registrada",
    descricao: "Hickson cadastrou a entrega #1250 (TD Tech).",
    cor: "primary",
  },
  {
    id: "2",
    hora: "13:10",
    titulo: "Motorista saiu para entrega",
    descricao: "Gonçalves saiu com a entrega #1249 às 09:25.",
    cor: "success",
  },
  {
    id: "3",
    hora: "11:47",
    titulo: "Entrega confirmada pelo cliente",
    descricao: "Cliente confirmou o recebimento da entrega #1248.",
    cor: "info",
  },
  {
    id: "4",
    hora: "09:00",
    titulo: "Pagamento conferido no caixa",
    descricao: "Bruna conferiu o pagamento Pix da entrega #1246.",
    cor: "muted",
  },
];
