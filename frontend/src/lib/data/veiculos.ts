import "server-only";

import { asc, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { veiculoGastos, veiculos } from "@/lib/db/schema";
import { formatBRL, formatDateBR } from "@/lib/format";
import {
  formatarPlaca,
  type VeiculosData,
} from "@/lib/veiculos";

function inicioMesAtual(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}-01`;
}

export async function getVeiculosData(): Promise<VeiculosData> {
  const db = getDb();

  if (!db) {
    return {
      veiculos: [],
      gastosRecentes: [],
      resumo: {
        ativos: 0,
        totalMes: formatBRL(0),
        combustivelMes: formatBRL(0),
        manutencaoMes: formatBRL(0),
      },
    };
  }

  const inicioMes = inicioMesAtual();

  const [listaVeiculos, gastosMes, gastosRecentesRows] = await Promise.all([
    db
      .select({
        id: veiculos.id,
        placa: veiculos.placa,
        marca: veiculos.marca,
        modelo: veiculos.modelo,
        ano: veiculos.ano,
        ativo: veiculos.ativo,
      })
      .from(veiculos)
      .orderBy(desc(veiculos.ativo), asc(veiculos.marca), asc(veiculos.modelo)),
    db
      .select({
        veiculoId: veiculoGastos.veiculoId,
        tipo: veiculoGastos.tipo,
        valor: veiculoGastos.valor,
      })
      .from(veiculoGastos)
      .where(gte(veiculoGastos.data, inicioMes)),
    db
      .select({
        id: veiculoGastos.id,
        veiculoId: veiculoGastos.veiculoId,
        placa: veiculos.placa,
        marca: veiculos.marca,
        modelo: veiculos.modelo,
        tipo: veiculoGastos.tipo,
        data: veiculoGastos.data,
        valor: veiculoGastos.valor,
        quilometragem: veiculoGastos.quilometragem,
        observacao: veiculoGastos.observacao,
      })
      .from(veiculoGastos)
      .innerJoin(veiculos, eq(veiculoGastos.veiculoId, veiculos.id))
      .orderBy(desc(veiculoGastos.data), desc(veiculoGastos.criadoEm))
      .limit(30),
  ]);

  const gastoPorVeiculo = new Map<string, number>();
  let totalMes = 0;
  let combustivelMes = 0;
  let manutencaoMes = 0;

  for (const gasto of gastosMes) {
    const valor = Number(gasto.valor);
    totalMes += valor;
    gastoPorVeiculo.set(
      gasto.veiculoId,
      (gastoPorVeiculo.get(gasto.veiculoId) ?? 0) + valor
    );

    if (gasto.tipo === "combustivel") combustivelMes += valor;
    if (gasto.tipo === "manutencao") manutencaoMes += valor;
  }

  return {
    veiculos: listaVeiculos.map((veiculo) => {
      const gastoMesNumerico = gastoPorVeiculo.get(veiculo.id) ?? 0;
      return {
        ...veiculo,
        placa: formatarPlaca(veiculo.placa),
        gastoMesNumerico,
        gastoMes: formatBRL(gastoMesNumerico),
      };
    }),
    gastosRecentes: gastosRecentesRows.map((gasto) => ({
      id: gasto.id,
      veiculoId: gasto.veiculoId,
      veiculo: `${gasto.marca} ${gasto.modelo}`,
      placa: formatarPlaca(gasto.placa),
      tipo: gasto.tipo,
      data: formatDateBR(gasto.data),
      valorNumerico: Number(gasto.valor),
      valor: formatBRL(Number(gasto.valor)),
      quilometragem: gasto.quilometragem,
      observacao: gasto.observacao,
    })),
    resumo: {
      ativos: listaVeiculos.filter((veiculo) => veiculo.ativo).length,
      totalMes: formatBRL(totalMes),
      combustivelMes: formatBRL(combustivelMes),
      manutencaoMes: formatBRL(manutencaoMes),
    },
  };
}
