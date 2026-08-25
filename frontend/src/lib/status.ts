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

// Type guard pro filtro "Filtrar situação" da tela de Entregas (Issue #7):
// o valor vem de um searchParam (string solta, pode ser qualquer coisa —
// inclusive vazio, quando nenhum filtro foi escolhido), então precisa ser
// validado contra os status reais antes de virar filtro na query.
export function isStatusEntrega(value: unknown): value is StatusEntrega {
  return (
    typeof value === "string" && Object.hasOwn(STATUS_LABEL, value)
  );
}

// Type guard equivalente para o filtro "Forma de pagamento" do Relatório
// (Issue #8) — mesmo raciocínio de isStatusEntrega: o valor vem de um
// searchParam solto e precisa ser validado antes de virar filtro na query.
export function isFormaPagamento(value: unknown): value is FormaPagamento {
  return (
    typeof value === "string" && Object.hasOwn(FORMA_PAGAMENTO_LABEL, value)
  );
}

// Valida "AAAA-MM-DD" vindo de um <input type="date"> via searchParam —
// aceita só o formato exato que o Postgres espera pra comparar contra a
// coluna `data` (evita passar lixo/formato errado direto pra query).
const REGEX_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
export function isDataIsoValida(value: unknown): value is string {
  return typeof value === "string" && REGEX_DATA_ISO.test(value);
}
