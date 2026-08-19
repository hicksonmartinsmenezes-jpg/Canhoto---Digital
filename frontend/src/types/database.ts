// Tipos manuais provisórios, espelhando backend/supabase/migrations/20260818000000_init_schema.sql
// (schema v2 — entrega ao cliente externo, ver claude/modelo-de-dados-site.md)
//
// Quando o projeto Supabase estiver criado, gere os tipos reais com:
//   npx supabase gen types typescript --project-id <ID_DO_PROJETO> > src/types/database.ts
// (ou --local, se estiver usando `supabase start` localmente)
// e substitua este arquivo pelo gerado.

export type PapelColaborador = "admin" | "gestor_setor" | "colaborador";
export type StatusEntrega = "pendente" | "entregue" | "cancelado";
export type FormaPagamento =
  | "dinheiro"
  | "pix"
  | "debito"
  | "cartao_1x"
  | "prazo";
export type TipoAnexoEntrega =
  | "xml_nfe"
  | "xml_cte"
  | "assinatura_cliente"
  | "foto";

export interface Setor {
  id: string;
  nome: string;
  ativo: boolean;
  criado_em: string;
}

export interface Colaborador {
  id: string;
  auth_user_id: string | null;
  nome: string;
  email: string | null;
  setor_id: string | null;
  cargo: string | null;
  papel: PapelColaborador;
  ativo: boolean;
  criado_em: string;
}

export interface Motoboy {
  id: string;
  nome: string;
  ativo: boolean;
  criado_em: string;
}

export interface Entrega {
  id: string;
  numero: number;
  data: string;
  cliente_nome: string;
  numero_pedido: string | null;
  numero_nfe: string | null;
  valor_pagamento: number;
  forma_pagamento: FormaPagamento;
  hora_saida: string | null;
  motoboy_id: string | null;
  cliente_assinou_em: string | null;
  caixa_id: string | null;
  caixa_confirmou_em: string | null;
  status: StatusEntrega;
  observacoes: string | null;
  cadastrado_por: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface EntregaAnexo {
  id: string;
  entrega_id: string;
  tipo: TipoAnexoEntrega;
  arquivo_url: string;
  capturado_em: string;
  capturado_por: string | null;
}

export interface EntregaHistorico {
  id: string;
  entrega_id: string;
  status_anterior: StatusEntrega | null;
  status_novo: StatusEntrega;
  alterado_por: string | null;
  alterado_em: string;
  observacao: string | null;
}

// Placeholder mínimo para o generic <Database> esperado pelo @supabase/ssr.
// Substitua pelo tipo gerado (`supabase gen types typescript`) quando possível.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
