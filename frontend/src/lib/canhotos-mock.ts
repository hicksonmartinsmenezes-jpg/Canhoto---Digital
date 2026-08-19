// Dados de exemplo para a tela de Entregas (listagem) — schema v2, baseado
// no romaneio real da Expedição. Ver claude/modelo-de-dados-site.md.
//
// Mapeamento das colunas do romaneio físico:
//   Data · Cliente · Nº Pedido · Nº NFe · Valor do Pagamento ·
//   Forma de Pagamento · Hora Saída · Motoboy Terceirizado (+assinatura) ·
//   Cliente (+assinatura) · Hora de Recebimento da Mercadoria · Ass. Caixa
//
// Substituir por consulta real ao Supabase (tabela `entregas`) quando o
// projeto estiver conectado.

import type { FormaPagamento, StatusEntrega } from "@/types/database";

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
}

export const CANHOTOS: EntregaListItem[] = [
  {
    id: "1",
    numero: "#1250",
    data: "18/08/2026",
    cliente: "TD Tech",
    numeroPedido: "J34818",
    numeroNfe: "11267",
    valor: "R$ 57,22",
    formaPagamento: "prazo",
    motoboy: "Gonçalves",
    caixa: null,
    status: "entregue",
  },
  {
    id: "2",
    numero: "#1249",
    data: "18/08/2026",
    cliente: "Rowlson",
    numeroPedido: "J34838",
    numeroNfe: "11272",
    valor: "R$ 322,72",
    formaPagamento: "pix",
    motoboy: "Da Paz",
    caixa: null,
    status: "pendente",
  },
  {
    id: "3",
    numero: "#1248",
    data: "17/08/2026",
    cliente: "Robson Corretora",
    numeroPedido: "873865",
    numeroNfe: "316000",
    valor: "R$ 235,32",
    formaPagamento: "dinheiro",
    motoboy: "Gonçalves",
    caixa: "Beatriz",
    status: "entregue",
  },
  {
    id: "4",
    numero: "#1247",
    data: "17/08/2026",
    cliente: "Automotic",
    numeroPedido: "875833",
    numeroNfe: "316001",
    valor: "R$ 143,38",
    formaPagamento: "debito",
    motoboy: "Gonçalves",
    caixa: "Beatriz",
    status: "entregue",
  },
  {
    id: "5",
    numero: "#1246",
    data: "16/08/2026",
    cliente: "Jadilson Morais",
    numeroPedido: "87407J",
    numeroNfe: "316123",
    valor: "R$ 52,59",
    formaPagamento: "pix",
    motoboy: null,
    caixa: null,
    status: "cancelado",
  },
];
