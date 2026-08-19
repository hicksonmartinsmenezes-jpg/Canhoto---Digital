// Dados de exemplo para a tela de Setores.
// Substituir por consulta real ao Supabase (tabela `setores`, com contagem
// de colaboradores/canhotos via join) quando o projeto estiver conectado.

export interface SetorListItem {
  id: string;
  nome: string;
  colaboradores: number;
  canhotosAbertos: number;
  ativo: boolean;
}

export const SETORES: SetorListItem[] = [
  { id: "1", nome: "Financeiro", colaboradores: 6, canhotosAbertos: 4, ativo: true },
  { id: "2", nome: "RH", colaboradores: 3, canhotosAbertos: 1, ativo: true },
  { id: "3", nome: "Manutenção", colaboradores: 9, canhotosAbertos: 7, ativo: true },
  { id: "4", nome: "Compras", colaboradores: 4, canhotosAbertos: 2, ativo: true },
  { id: "5", nome: "Diretoria", colaboradores: 2, canhotosAbertos: 0, ativo: true },
  { id: "6", nome: "Almoxarifado (antigo)", colaboradores: 0, canhotosAbertos: 0, ativo: false },
];
