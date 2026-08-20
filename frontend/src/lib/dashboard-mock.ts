// Dados de exemplo para o Dashboard — schema v2 (entrega ao cliente externo,
// baseado no romaneio real da Expedição). Ver claude/modelo-de-dados-site.md.
//
// A maior parte do que existia aqui (entregas recentes, contagem por
// status, atividade recente) já foi substituída por consultas reais ao
// Supabase — ver @/lib/data/entregas — e removida deste arquivo em
// 20/08/2026 (a limpeza foi puxada pelo Knip, ver AGENTS.md, seção "esteira
// de qualidade"). Só ALERTAS/Alerta continuam aqui, porque o dropdown de
// notificações (NotificationsBell) ainda lê daqui.
//
// Inconsistência conhecida (achado durante essa limpeza, 20/08/2026): o
// card "Alertas e pendências" do próprio Dashboard já usa alertas REAIS
// (tipo Alerta vindo de @/lib/data/entregas, não este arquivo) — então hoje
// o sino de notificações no topo mostra números diferentes (mockados) do
// que o card do Dashboard (reais). Não corrigido nesta limpeza porque foge
// do escopo (esteira de qualidade) — registrar como Issue própria
// (correção) pra migrar o NotificationsBell pra dados reais também.

export interface Alerta {
  id: string;
  tag: string;
  titulo: string;
  descricao: string;
  tom: "critico" | "atencao" | "info";
}

export const ALERTAS: Alerta[] = [
  {
    id: "conferencia-caixa",
    tag: "CAIXA",
    titulo: "7 entregas pendentes de conferência de caixa",
    descricao:
      "Pagamento recebido pelo motorista na entrega ainda não foi conferido pelo caixa.",
    tom: "critico",
  },
  {
    id: "aguardando-saida",
    tag: "SAÍDA",
    titulo: "23 entregas aguardando saída",
    descricao: "Cadastradas no sistema, mas o motorista ainda não saiu para entrega.",
    tom: "atencao",
  },
  {
    id: "sem-nfe",
    tag: "CADASTRO",
    titulo: "12 entregas sem número de NF-e",
    descricao: "Cadastro incompleto — dificulta a consulta depois.",
    tom: "info",
  },
];
