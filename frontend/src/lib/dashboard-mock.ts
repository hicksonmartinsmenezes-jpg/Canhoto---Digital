// Dados de exemplo para o Dashboard — mesmos números do protótipo visual
// (dashboard-canhoto-interno.html). Substituir por consultas reais ao
// Supabase quando as tabelas estiverem populadas (ver claude/modelo-de-dados-site.md).

import type { StatusCanhoto } from "@/types/database";

export interface CanhotoRecente {
  numero: string;
  documento: string;
  responsavel: string;
  setor: string;
  data: string;
  status: StatusCanhoto;
}

export const CANHOTOS_RECENTES: CanhotoRecente[] = [
  {
    numero: "#1250",
    documento: "NF 4582",
    responsavel: "João Silva",
    setor: "Financeiro",
    data: "18/08/2026",
    status: "recebido",
  },
  {
    numero: "#1249",
    documento: "Contrato 0123",
    responsavel: "Maria Santos",
    setor: "RH",
    data: "18/08/2026",
    status: "pendente",
  },
  {
    numero: "#1248",
    documento: "Ordem de Serviço 778",
    responsavel: "Carlos Lima",
    setor: "Manutenção",
    data: "17/08/2026",
    status: "recebido",
  },
  {
    numero: "#1247",
    documento: "NF 4571",
    responsavel: "Ana Ferreira",
    setor: "Compras",
    data: "17/08/2026",
    status: "devolvido",
  },
  {
    numero: "#1246",
    documento: "Memorando 034",
    responsavel: "Bruno Alves",
    setor: "Diretoria",
    data: "16/08/2026",
    status: "cancelado",
  },
];

export interface StatusCount {
  status: StatusCanhoto;
  label: string;
  value: number;
}

// value em cada status — soma usada para o gráfico de rosca do Dashboard.
export const CANHOTOS_POR_STATUS: StatusCount[] = [
  { status: "recebido", label: "Recebidos", value: 982 },
  { status: "pendente", label: "Pendentes", value: 156 },
  { status: "devolvido", label: "Devolvidos", value: 74 },
  { status: "cancelado", label: "Cancelados", value: 36 },
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
    id: "vencidos",
    tag: "48H DE ATRASO",
    titulo: "7 canhotos vencidos",
    descricao: "Prazo de arquivamento pelo setor responsável expirado.",
    tom: "critico",
  },
  {
    id: "pendentes-assinatura",
    tag: "ASSINATURA",
    titulo: "23 canhotos pendentes de recebimento",
    descricao:
      "Aguardando assinatura do responsável há mais de 3 dias úteis.",
    tom: "atencao",
  },
  {
    id: "proximos-vencimento",
    tag: "5 DIAS",
    titulo: "12 documentos próximos do vencimento",
    descricao: "Vencem nos próximos 5 dias e precisam de conferência.",
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
    titulo: "Documento recebido",
    descricao: "João Silva recebeu o documento NF 4582 no setor Financeiro.",
    cor: "primary",
  },
  {
    id: "2",
    hora: "13:10",
    titulo: "Canhoto cadastrado",
    descricao: "Maria Santos cadastrou o canhoto #1249 (Contrato 0123).",
    cor: "success",
  },
  {
    id: "3",
    hora: "11:47",
    titulo: "Canhoto devolvido",
    descricao: "Carlos Lima devolveu o canhoto #1245 ao setor de Manutenção.",
    cor: "info",
  },
  {
    id: "4",
    hora: "09:00",
    titulo: "Relatório exportado",
    descricao: "Relatório consolidado de pendências enviado à diretoria.",
    cor: "muted",
  },
];
