import type { FormaPagamento, StatusEntrega } from "@/types/database";

// Escala fixa de status da Entrega — mesma paleta usada nos badges da tabela
// e no gráfico de status do Dashboard, para manter consistência visual em
// todo o site (ver claude/estrutura-frontend-site.md do projeto).
// Schema v2 (entrega ao cliente externo): 3 estados, ver claude/modelo-de-dados-site.md.
export const STATUS_LABEL: Record<StatusEntrega, string> = {
  pendente: "Pendente",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const STATUS_HEX: Record<StatusEntrega, string> = {
  entregue: "#059669", // emerald-600 — bom
  pendente: "#f59e0b", // amber-500 — atenção (mesma cor da marca/ação primária)
  cancelado: "#dc2626", // red-600 — crítico
};

export const STATUS_BADGE_CLASSES: Record<StatusEntrega, string> = {
  entregue: "bg-emerald-50 border-emerald-200 text-emerald-700",
  pendente: "bg-amber-50 border-amber-200 text-amber-700",
  cancelado: "bg-red-50 border-red-200 text-red-700",
};

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  debito: "Débito",
  cartao_1x: "Cartão 1x",
  prazo: "Prazo",
};
