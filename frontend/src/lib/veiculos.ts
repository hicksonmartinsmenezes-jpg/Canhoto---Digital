export type TipoGastoVeiculo =
  | "combustivel"
  | "manutencao"
  | "multa"
  | "lava_jato"
  | "pedagio"
  | "outro";

export const TIPO_GASTO_VEICULO_LABEL: Record<TipoGastoVeiculo, string> = {
  combustivel: "Combustível",
  manutencao: "Manutenção",
  multa: "Multa",
  lava_jato: "Lava-jato",
  pedagio: "Pedágio",
  outro: "Outro",
};

export interface VeiculoListItem {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number | null;
  ativo: boolean;
  motoboyId: string | null;
  motoboyNome: string | null;
  gastoMes: string;
  gastoMesNumerico: number;
}

export interface VeiculoGastoItem {
  id: string;
  veiculoId: string;
  veiculo: string;
  placa: string;
  tipo: TipoGastoVeiculo;
  data: string;
  valor: string;
  valorNumerico: number;
  quilometragem: number | null;
  observacao: string | null;
}

interface VeiculosResumo {
  ativos: number;
  totalMes: string;
  combustivelMes: string;
  manutencaoMes: string;
}

export interface VeiculosData {
  veiculos: VeiculoListItem[];
  /** Motoristas ativos, para escolher o responsável pelo veículo. */
  motoboys: { id: string; nome: string }[];
  gastosRecentes: VeiculoGastoItem[];
  resumo: VeiculosResumo;
}

export function formatarPlaca(placa: string): string {
  if (/^[A-Z]{3}[0-9]{4}$/.test(placa)) {
    return `${placa.slice(0, 3)}-${placa.slice(3)}`;
  }

  return placa;
}
