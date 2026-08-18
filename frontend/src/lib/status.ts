import type { StatusCanhoto } from "@/types/database";

// Escala fixa de status do Canhoto Interno — mesma paleta usada nos badges
// da tabela e no gráfico de status do Dashboard, para manter consistência
// visual em todo o site (ver claude/estrutura-frontend-site.md do projeto).
export const STATUS_LABEL: Record<StatusCanhoto, string> = {
  pendente: "Pendente",
  recebido: "Recebido",
  devolvido: "Devolvido",
  cancelado: "Cancelado",
};

export const STATUS_HEX: Record<StatusCanhoto, string> = {
  recebido: "#059669", // emerald-600 — bom
  pendente: "#f59e0b", // amber-500 — atenção (mesma cor da marca/ação primária)
  devolvido: "#ea580c", // orange-600 — mais sério
  cancelado: "#dc2626", // red-600 — crítico
};

export const STATUS_BADGE_CLASSES: Record<StatusCanhoto, string> = {
  recebido: "bg-emerald-50 border-emerald-200 text-emerald-700",
  pendente: "bg-amber-50 border-amber-200 text-amber-700",
  devolvido: "bg-orange-50 border-orange-200 text-orange-700",
  cancelado: "bg-red-50 border-red-200 text-red-700",
};
