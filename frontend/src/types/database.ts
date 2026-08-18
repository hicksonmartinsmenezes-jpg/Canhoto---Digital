// Tipos manuais provisórios, espelhando backend/supabase/migrations/20260818000000_init_schema.sql
//
// Quando o projeto Supabase estiver criado, gere os tipos reais com:
//   npx supabase gen types typescript --project-id <ID_DO_PROJETO> > src/types/database.ts
// (ou --local, se estiver usando `supabase start` localmente)
// e substitua este arquivo pelo gerado.

export type PapelColaborador = "admin" | "gestor_setor" | "colaborador";
export type StatusCanhoto = "pendente" | "recebido" | "devolvido" | "cancelado";
export type FormaComprovacao =
  | "assinatura_tela"
  | "foto"
  | "canhoto_fisico_digitalizado";
export type TipoAnexo = "assinatura" | "foto" | "scan_canhoto_fisico";

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

export interface TipoDocumento {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface Canhoto {
  id: string;
  numero: number;
  tipo_documento_id: string;
  numero_documento: string | null;
  setor_id: string;
  responsavel_id: string;
  data_emissao: string | null;
  data_assinatura: string | null;
  prazo_arquivamento: string | null;
  data_arquivamento: string | null;
  status: StatusCanhoto;
  forma_comprovacao: FormaComprovacao | null;
  observacoes: string | null;
  cadastrado_por: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface CanhotoAnexo {
  id: string;
  canhoto_id: string;
  tipo: TipoAnexo;
  arquivo_url: string;
  capturado_em: string;
  capturado_por: string | null;
  local_captura: string | null;
}

export interface CanhotoHistorico {
  id: string;
  canhoto_id: string;
  status_anterior: StatusCanhoto | null;
  status_novo: StatusCanhoto;
  alterado_por: string | null;
  alterado_em: string;
  observacao: string | null;
}

// Placeholder mínimo para o generic <Database> esperado pelo @supabase/ssr.
// Substitua pelo tipo gerado (`supabase gen types typescript`) quando possível.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
