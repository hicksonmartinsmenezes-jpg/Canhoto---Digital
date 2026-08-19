// Dados de exemplo para a tela de Colaboradores.
// Substituir por consulta real ao Supabase (tabela `colaboradores`) quando o
// projeto estiver conectado.

import type { PapelColaborador } from "@/types/database";

export interface ColaboradorListItem {
  id: string;
  nome: string;
  email: string | null;
  setor: string;
  cargo: string | null;
  papel: PapelColaborador;
  ativo: boolean;
}

export const PAPEL_LABEL: Record<PapelColaborador, string> = {
  admin: "Admin",
  gestor_setor: "Gestor de setor",
  colaborador: "Colaborador",
};

export const COLABORADORES: ColaboradorListItem[] = [
  {
    id: "1",
    nome: "João Silva",
    email: "joao.silva@rildon.com.br",
    setor: "Financeiro",
    cargo: "Analista Financeiro",
    papel: "colaborador",
    ativo: true,
  },
  {
    id: "2",
    nome: "Maria Santos",
    email: "maria.santos@rildon.com.br",
    setor: "RH",
    cargo: "Analista de RH",
    papel: "gestor_setor",
    ativo: true,
  },
  {
    id: "3",
    nome: "Carlos Lima",
    email: "carlos.lima@rildon.com.br",
    setor: "Manutenção",
    cargo: "Técnico",
    papel: "colaborador",
    ativo: true,
  },
  {
    id: "4",
    nome: "Ana Ferreira",
    email: "ana.ferreira@rildon.com.br",
    setor: "Compras",
    cargo: "Comprador",
    papel: "colaborador",
    ativo: true,
  },
  {
    id: "5",
    nome: "Bruno Alves",
    email: "bruno.alves@rildon.com.br",
    setor: "Diretoria",
    cargo: "Diretor",
    papel: "admin",
    ativo: false,
  },
];
