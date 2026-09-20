export type PerfilTreinamento =
  | "administrativo"
  | "expedicao"
  | "motorista";

export type StatusTreinamento =
  | "nao_iniciado"
  | "em_andamento"
  | "concluido";

export interface MaterialTreinamento {
  titulo: string;
  href: string;
}

export interface Treinamento {
  slug: string;
  titulo: string;
  perfis: PerfilTreinamento[];
  duracaoMinutos: number;
  objetivo: string;
  passos: string[];
  pontosImportantes?: string[];
  videoUrl?: string;
  materiais?: MaterialTreinamento[];
}

export const PERFIL_TREINAMENTO_LABEL: Record<PerfilTreinamento, string> = {
  administrativo: "Administrativo",
  expedicao: "Expedição",
  motorista: "Motorista",
};

export const STATUS_TREINAMENTO_LABEL: Record<StatusTreinamento, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

export const TREINAMENTOS: Treinamento[] = [
  {
    slug: "primeiros-passos",
    titulo: "Primeiros passos no Canhoto Digital",
    perfis: ["administrativo", "expedicao"],
    duracaoMinutos: 5,
    objetivo:
      "Entender a navegação principal, o Dashboard e como os módulos atuais do sistema se conectam.",
    passos: [
      "Entre no Portal Admin com seu usuário e confirme que o Dashboard foi carregado.",
      "Use a barra lateral para acessar Entregas, Cadastros, Gestão de Veículos, Relatórios e Treinamentos.",
      "No Dashboard, acompanhe os totais de entregas, alertas e atividade recente.",
      "Use cada módulo para registrar a operação no momento em que ela acontece, evitando controles paralelos.",
    ],
    pontosImportantes: [
      "O Portal Admin e a área do motorista possuem acessos diferentes.",
      "Os dados operacionais desta versão são armazenados no Supabase.",
      "Nunca compartilhe credenciais entre colaboradores.",
    ],
  },
  {
    slug: "cadastrar-entrega",
    titulo: "Cadastrar e preparar uma entrega",
    perfis: ["expedicao", "administrativo"],
    duracaoMinutos: 6,
    objetivo:
      "Cadastrar uma entrega com os dados necessários para o fluxo operacional atual.",
    passos: [
      "Abra Entregas e clique em Adicionar Entrega.",
      "Informe os dados do cliente e da entrega solicitados pelo formulário.",
      "Preencha o valor e a forma de pagamento conforme a operação.",
      "Selecione o motorista responsável quando a entrega já estiver definida.",
      "Revise os dados e salve a entrega.",
      "Confirme que a nova entrega aparece na listagem.",
    ],
    pontosImportantes: [
      "Revise cliente, valor e forma de pagamento antes de salvar.",
      "O motorista só deve receber entregas realmente atribuídas a ele.",
    ],
  },
  {
    slug: "acompanhar-entregas",
    titulo: "Acompanhar entregas do dia",
    perfis: ["administrativo", "expedicao"],
    duracaoMinutos: 5,
    objetivo:
      "Acompanhar o andamento do dia e identificar rapidamente entregas pendentes ou concluídas.",
    passos: [
      "Abra o Dashboard e confira os indicadores de entregas.",
      "Use a seção de entregas recentes para identificar movimentações do dia.",
      "Abra a listagem de Entregas para consultar situação, motorista e dados da operação.",
      "Use os alertas do sistema para localizar cadastros ou entregas que exigem atenção.",
    ],
    pontosImportantes: [
      "A situação da entrega deve refletir o que realmente aconteceu na operação.",
      "Corrija dados incorretos antes que o motorista execute a entrega.",
    ],
  },
  {
    slug: "operacao-motorista",
    titulo: "Operação do motorista",
    perfis: ["motorista"],
    duracaoMinutos: 6,
    objetivo:
      "Executar o fluxo mobile atual desde o login até a confirmação da entrega.",
    passos: [
      "Abra a área do motorista no celular e entre usando telefone e PIN.",
      "Confira as entregas disponíveis para o dia.",
      "Revise cliente, endereço, valor e forma de pagamento.",
      "Use Iniciar entrega quando começar o atendimento.",
      "Após concluir a entrega, use Confirmar entrega para registrar a finalização.",
    ],
    pontosImportantes: [
      "Cada motorista só consegue operar entregas vinculadas ao próprio cadastro.",
      "Não confirme uma entrega antes de o atendimento ter sido realmente concluído.",
    ],
  },
  {
    slug: "colaboradores-acessos",
    titulo: "Colaboradores e acessos",
    perfis: ["administrativo"],
    duracaoMinutos: 4,
    objetivo:
      "Manter os dados dos colaboradores organizados e evitar acessos compartilhados.",
    passos: [
      "Abra Cadastros e entre em Colaboradores.",
      "Cadastre os dados solicitados do colaborador.",
      "Revise o papel selecionado antes de salvar.",
      "Mantenha o cadastro atualizado quando cargo ou situação mudar.",
      "Desative acessos que não devem mais ser utilizados.",
    ],
    pontosImportantes: [
      "Cada pessoa deve utilizar o próprio acesso.",
      "Dados de contato corretos facilitam a manutenção dos cadastros.",
    ],
  },
  {
    slug: "relatorios",
    titulo: "Relatórios e exportação",
    perfis: ["administrativo", "expedicao"],
    duracaoMinutos: 4,
    objetivo:
      "Filtrar as entregas por período e exportar os dados necessários para conferência.",
    passos: [
      "Abra Relatórios.",
      "Defina o período desejado.",
      "Use Situação e Pagamento quando precisar restringir a consulta.",
      "Clique em Filtrar e confira as entregas retornadas.",
      "Use Exportar CSV quando precisar trabalhar os dados fora do sistema.",
    ],
    pontosImportantes: [
      "O período padrão considera o mês atual.",
      "Os valores apresentados respeitam os filtros ativos.",
    ],
  },
  {
    slug: "problemas-comuns",
    titulo: "Problemas comuns e conferências rápidas",
    perfis: ["administrativo", "expedicao", "motorista"],
    duracaoMinutos: 6,
    objetivo:
      "Resolver as situações operacionais mais frequentes antes de acionar suporte técnico.",
    passos: [
      "Motorista sem entrega: confira se a entrega está atribuída ao motorista correto e se pertence ao dia atual.",
      "Login do motorista falhou: confirme telefone, PIN e se o cadastro do motorista está ativo.",
      "Relatório vazio: revise período, situação e forma de pagamento selecionados.",
      "Dados desatualizados após uma ação: atualize a página antes de repetir a operação.",
      "Quando o erro persistir, registre a mensagem exibida e o passo em que ocorreu.",
    ],
    pontosImportantes: [
      "Nunca compartilhe senhas, PINs ou chaves do Supabase para tentar resolver um problema.",
      "Evite repetir ações de gravação várias vezes quando a resposta do sistema estiver lenta.",
    ],
  },
];

export function obterTreinamentoPorSlug(
  slug: string
): Treinamento | undefined {
  return TREINAMENTOS.find((treinamento) => treinamento.slug === slug);
}

export function isPerfilTreinamento(
  valor: string | undefined
): valor is PerfilTreinamento {
  return (
    valor === "administrativo" ||
    valor === "expedicao" ||
    valor === "motorista"
  );
}
