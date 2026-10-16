// Tipos de domínio compartilhados pela aplicação.
// O schema persistente oficial é PostgreSQL e está mapeado com Drizzle em
// @/lib/db/schema.ts.

export type PapelColaborador = "admin" | "gestor_setor" | "colaborador";
export type StatusEntrega = "pendente" | "entregue" | "cancelado";
export type FormaPagamento =
  | "dinheiro"
  | "pix"
  | "debito"
  | "cartao_1x"
  | "prazo";
type TipoAnexoEntrega =
  | "xml_nfe"
  | "xml_cte"
  | "assinatura_cliente"
  | "foto"
  | "comprovante_pix"
  | "foto_produto"
  | "danfe_pdf";

type TipoGastoVeiculo =
  | "combustivel"
  | "manutencao"
  | "multa"
  | "lava_jato"
  | "pedagio"
  | "outro";

type StatusTreinamento = "em_andamento" | "concluido";

interface Setor {
  id: string;
  nome: string;
  ativo: boolean;
  criado_em: string;
}

interface Colaborador {
  id: string;
  auth_user_id: string | null;
  nome: string;
  email: string | null;
  celular: string | null;
  setor_id: string | null;
  cargo: string | null;
  papel: PapelColaborador;
  ativo: boolean;
  criado_em: string;
}

interface Motoboy {
  id: string;
  nome: string;
  ativo: boolean;
  // Base do login do app do motorista (Issue #5, sub-issue #28) — ambos
  // opcionais porque motoristas já cadastrados não têm até serem editados.
  telefone: string | null;
  pin_hash: string | null;
  criado_em: string;
}

interface Entrega {
  id: string;
  numero: number;
  data: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  // Endereço de entrega (texto livre, como cliente_nome) — sem isso o app
  // do motorista não tem como mostrar pra onde ir (Issue #5, sub-issue #28).
  endereco: string | null;
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

interface EntregaAnexo {
  id: string;
  entrega_id: string;
  tipo: TipoAnexoEntrega;
  arquivo_url: string;
  capturado_em: string;
  capturado_por: string | null;
}

interface Veiculo {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

interface VeiculoGasto {
  id: string;
  veiculo_id: string;
  tipo: TipoGastoVeiculo;
  data: string;
  valor: number;
  quilometragem: number | null;
  observacao: string | null;
  cadastrado_por_admin: string | null;
  criado_em: string;
}

interface TreinamentoProgresso {
  id: string;
  usuario_admin_id: string;
  treinamento_slug: string;
  status: StatusTreinamento;
  iniciado_em: string;
  concluido_em: string | null;
  atualizado_em: string;
}

interface EntregaHistorico {
  id: string;
  entrega_id: string;
  status_anterior: StatusEntrega | null;
  status_novo: StatusEntrega;
  alterado_por: string | null;
  alterado_em: string;
  observacao: string | null;
}

