export type PerfilTreinamento =
  | "administrativo"
  | "expedicao"
  | "motorista"
  | "frota";

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
  frota: "Frota",
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
      "Entender a navegação principal, o Dashboard e como os módulos do sistema se conectam.",
    passos: [
      "Entre no Portal Admin com seu usuário e confirme que o Dashboard foi carregado.",
      "Use a barra lateral para acessar Entregas, Cadastros, Gestão de Veículos, Relatórios e Treinamentos.",
      "No Dashboard, acompanhe os totais de entregas, alertas, atividade recente e motoristas em rota.",
      "Use cada módulo para registrar a operação no momento em que ela acontece, evitando controles paralelos.",
    ],
    pontosImportantes: [
      "O Portal Admin e a área do motorista possuem acessos diferentes.",
      "O Dashboard reflete os dados registrados no PostgreSQL local.",
      "Nunca compartilhe credenciais entre colaboradores.",
    ],
  },
  {
    slug: "cadastrar-entrega",
    titulo: "Cadastrar e preparar uma entrega",
    perfis: ["expedicao", "administrativo"],
    duracaoMinutos: 6,
    objetivo:
      "Cadastrar uma entrega com os dados necessários para que ela chegue corretamente ao motorista.",
    passos: [
      "Abra Entregas e clique em Adicionar Entrega.",
      "Informe cliente, endereço, CEP e os dados comerciais solicitados.",
      "Preencha o valor e a forma de pagamento conforme a operação.",
      "Selecione o motorista responsável quando a entrega já estiver definida.",
      "Revise os dados e salve a entrega.",
      "Confirme que a nova entrega aparece na listagem e no fluxo operacional esperado.",
    ],
    pontosImportantes: [
      "CEP deve conter 8 dígitos.",
      "Endereço correto é essencial para a abertura da rota no Waze.",
      "O motorista só deve receber entregas realmente atribuídas a ele.",
    ],
  },
  {
    slug: "acompanhar-entregas",
    titulo: "Acompanhar entregas e motoristas em rota",
    perfis: ["administrativo", "expedicao"],
    duracaoMinutos: 5,
    objetivo:
      "Acompanhar o andamento do dia e identificar rapidamente entregas pendentes ou motoristas em rota.",
    passos: [
      "Abra o Dashboard e confira os indicadores de entregas.",
      "Use a seção de entregas recentes para identificar movimentações do dia.",
      "No mapa de motoristas, confira quem está em rota e quem possui localização disponível.",
      "Clique em um motorista quando precisar centralizar a localização dele no mapa.",
      "Abra a listagem de Entregas para consultar detalhes ou corrigir dados operacionais.",
    ],
    pontosImportantes: [
      "A posição exibida é a última localização compartilhada pelo navegador do motorista.",
      "Aplicativos em segundo plano, como o Waze, podem suspender temporariamente a atualização do navegador.",
    ],
  },
  {
    slug: "operacao-motorista",
    titulo: "Operação do motorista",
    perfis: ["motorista"],
    duracaoMinutos: 6,
    objetivo:
      "Executar o fluxo mobile desde o login até o início da rota sem depender do Portal Admin.",
    passos: [
      "Abra a área do motorista no celular e entre usando telefone e PIN.",
      "Confira as entregas disponíveis para o dia.",
      "Abra a entrega que será realizada e revise cliente, endereço e informações necessárias.",
      "Inicie a entrega para registrar a saída.",
      "Permita o compartilhamento de localização quando o navegador solicitar.",
      "Use Abrir rota no Waze somente quando quiser sair do painel para navegação.",
    ],
    pontosImportantes: [
      "O Waze é opcional; iniciar a entrega não deve tirar o motorista do navegador automaticamente.",
      "Cada motorista só consegue operar entregas vinculadas ao próprio cadastro.",
    ],
  },
  {
    slug: "comprovante-entrega",
    titulo: "Finalizar entrega com comprovante",
    perfis: ["motorista"],
    duracaoMinutos: 5,
    objetivo:
      "Registrar a foto da entrega e, se quiser, as fotos do produto e (em pagamentos Pix) o comprovante de pagamento.",
    passos: [
      "Abra a entrega que está em rota.",
      "Registre a foto da entrega realizada.",
      "Se quiser, tire também fotos do produto entregue (toque no + para adicionar mais de uma).",
      "Se o pagamento for Pix, você também pode fotografar o comprovante de pagamento.",
      "Revise os registros e finalize a entrega.",
    ],
    pontosImportantes: [
      "Só a foto da entrega é obrigatória para concluir a entrega.",
      "As fotos do produto e o comprovante Pix são opcionais e aparecem separados da foto da entrega no Portal Admin.",
    ],
  },
  {
    slug: "gestao-veiculos",
    titulo: "Gestão de veículos e despesas",
    perfis: ["frota", "administrativo"],
    duracaoMinutos: 6,
    objetivo:
      "Manter o cadastro da frota e registrar os gastos operacionais por veículo.",
    passos: [
      "Abra Gestão de Veículos e cadastre o veículo com placa, marca, modelo e ano.",
      "Use Registrar gasto para lançar uma despesa vinculada ao veículo.",
      "Selecione a categoria correta: combustível, manutenção, multa, lava-jato, pedágio ou outro.",
      "Informe data, valor e, quando disponível, quilometragem e observação.",
      "Acompanhe o gasto do mês e o histórico de lançamentos.",
      "Inative veículos que saírem da frota em vez de perder o histórico financeiro.",
    ],
    pontosImportantes: [
      "Um gasto só pode ser registrado depois que o veículo existe no cadastro.",
      "Quilometragem ajuda a relacionar custos com o uso real da frota.",
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
      "Cadastre nome, e-mail, celular, cargo e papel do colaborador.",
      "Revise o papel selecionado antes de salvar.",
      "Mantenha o cadastro atualizado quando cargo ou situação do colaborador mudar.",
      "Desative acessos que não devem mais ser utilizados.",
    ],
    pontosImportantes: [
      "Cada pessoa deve utilizar o próprio acesso.",
      "Dados de contato corretos facilitam identificação e manutenção dos cadastros.",
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
    perfis: ["administrativo", "expedicao", "motorista", "frota"],
    duracaoMinutos: 7,
    objetivo:
      "Resolver as situações operacionais mais frequentes antes de acionar suporte técnico.",
    passos: [
      "Motorista sem entrega: confira se a entrega está atribuída ao motorista correto e se pertence ao fluxo do dia.",
      "Localização não aparece: confirme a permissão de localização no navegador e retorne ao painel do motorista para atualizar.",
      "Waze não abriu: confira se a entrega possui endereço válido e use novamente o botão Abrir rota no Waze.",
      "Não consegue registrar gasto: confirme se já existe pelo menos um veículo cadastrado.",
      "Relatório vazio: revise período, situação e forma de pagamento selecionados.",
      "Após uma atualização do sistema, atualize a página antes de repetir uma ação.",
    ],
    pontosImportantes: [
      "Não exponha o PostgreSQL ou credenciais ao tentar resolver problemas de acesso.",
      "Quando o erro persistir, registre a mensagem exibida e o passo em que ocorreu.",
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
    valor === "motorista" ||
    valor === "frota"
  );
}
