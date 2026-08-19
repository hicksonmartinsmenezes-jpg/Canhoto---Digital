// Dados de exemplo para a tela de Motoboys — entregadores terceirizados,
// sem login no sistema, cadastro leve de referência para os romaneios.
// Substituir por consulta real ao Supabase (tabela `motoboys`) quando o
// projeto estiver conectado.

export interface MotoboyListItem {
  id: string;
  nome: string;
  entregasNoMes: number;
  ativo: boolean;
}

export const MOTOBOYS: MotoboyListItem[] = [
  { id: "1", nome: "Gonçalves", entregasNoMes: 42, ativo: true },
  { id: "2", nome: "Da Paz", entregasNoMes: 31, ativo: true },
  { id: "3", nome: "Kaique", entregasNoMes: 18, ativo: true },
  { id: "4", nome: "Wesley (afastado)", entregasNoMes: 0, ativo: false },
];
