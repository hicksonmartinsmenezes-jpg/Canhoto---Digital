"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { obterAdminAutenticado } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { codigoErroPostgres, mensagemErroBanco } from "@/lib/db/errors";
import { veiculoGastos, veiculos } from "@/lib/db/schema";
import { checarRateLimit, RATE_LIMIT_ESTRITO } from "@/lib/rate-limit";
import type { TipoGastoVeiculo } from "@/lib/veiculos";

export interface VeiculoActionResult {
  ok: boolean;
  error?: string;
}

export interface VeiculoInput {
  placa: string;
  marca: string;
  modelo: string;
  ano: number | null;
  ativo?: boolean;
}

export interface GastoVeiculoInput {
  veiculoId: string;
  tipo: TipoGastoVeiculo;
  data: string;
  valor: number;
  quilometragem: number | null;
  observacao: string;
}

const ERRO_BANCO =
  "Banco de dados indisponível neste ambiente — confirme a DATABASE_URL.";

const TIPOS_GASTO: TipoGastoVeiculo[] = [
  "combustivel",
  "manutencao",
  "multa",
  "lava_jato",
  "pedagio",
  "outro",
];

function normalizarPlaca(valor: string): string {
  return valor.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

function validarVeiculo(input: VeiculoInput): string | null {
  const placa = normalizarPlaca(input.placa);
  if (!/^[A-Z0-9]{7}$/.test(placa)) {
    return "Informe uma placa válida com 7 caracteres.";
  }

  if (!input.marca.trim()) return "Informe a marca do veículo.";
  if (!input.modelo.trim()) return "Informe o modelo do veículo.";

  if (
    input.ano !== null &&
    (!Number.isInteger(input.ano) || input.ano < 1950 || input.ano > 2100)
  ) {
    return "Informe um ano válido.";
  }

  return null;
}

export async function criarVeiculo(
  input: VeiculoInput
): Promise<VeiculoActionResult> {
  const admin = await obterAdminAutenticado();
  if (!admin) {
    return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  }

  const limite = await checarRateLimit("criarVeiculo");
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const erroValidacao = validarVeiculo(input);
  if (erroValidacao) return { ok: false, error: erroValidacao };

  const db = getDb();
  if (!db) return { ok: false, error: ERRO_BANCO };

  try {
    await db.insert(veiculos).values({
      placa: normalizarPlaca(input.placa),
      marca: input.marca.trim(),
      modelo: input.modelo.trim(),
      ano: input.ano,
      ativo: true,
    });
  } catch (error) {
    if (codigoErroPostgres(error) === "23505") {
      return { ok: false, error: "Essa placa já está cadastrada." };
    }
    return {
      ok: false,
      error: mensagemErroBanco("criarVeiculo", error),
    };
  }

  revalidatePath("/veiculos");
  return { ok: true };
}

export async function atualizarVeiculo(
  id: string,
  input: VeiculoInput
): Promise<VeiculoActionResult> {
  const admin = await obterAdminAutenticado();
  if (!admin) {
    return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  }

  const limite = await checarRateLimit("atualizarVeiculo");
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const erroValidacao = validarVeiculo(input);
  if (erroValidacao) return { ok: false, error: erroValidacao };

  const db = getDb();
  if (!db) return { ok: false, error: ERRO_BANCO };

  try {
    const [atualizado] = await db
      .update(veiculos)
      .set({
        placa: normalizarPlaca(input.placa),
        marca: input.marca.trim(),
        modelo: input.modelo.trim(),
        ano: input.ano,
        ativo: input.ativo ?? true,
        atualizadoEm: new Date().toISOString(),
      })
      .where(eq(veiculos.id, id))
      .returning({ id: veiculos.id });

    if (!atualizado) {
      return { ok: false, error: "Veículo não encontrado." };
    }
  } catch (error) {
    if (codigoErroPostgres(error) === "23505") {
      return { ok: false, error: "Essa placa já está cadastrada." };
    }
    return {
      ok: false,
      error: mensagemErroBanco("atualizarVeiculo", error),
    };
  }

  revalidatePath("/veiculos");
  return { ok: true };
}

export async function registrarGastoVeiculo(
  input: GastoVeiculoInput
): Promise<VeiculoActionResult> {
  const admin = await obterAdminAutenticado();
  if (!admin) {
    return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  }

  const limite = await checarRateLimit("registrarGastoVeiculo");
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  if (!input.veiculoId) {
    return { ok: false, error: "Selecione um veículo." };
  }
  if (!TIPOS_GASTO.includes(input.tipo)) {
    return { ok: false, error: "Selecione um tipo de gasto válido." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.data)) {
    return { ok: false, error: "Informe uma data válida." };
  }
  if (!Number.isFinite(input.valor) || input.valor <= 0) {
    return { ok: false, error: "Informe um valor maior que zero." };
  }
  if (
    input.quilometragem !== null &&
    (!Number.isInteger(input.quilometragem) || input.quilometragem < 0)
  ) {
    return { ok: false, error: "Informe uma quilometragem válida." };
  }

  const db = getDb();
  if (!db) return { ok: false, error: ERRO_BANCO };

  const [veiculo] = await db
    .select({ id: veiculos.id })
    .from(veiculos)
    .where(eq(veiculos.id, input.veiculoId))
    .limit(1);

  if (!veiculo) {
    return { ok: false, error: "Veículo não encontrado." };
  }

  try {
    await db.insert(veiculoGastos).values({
      veiculoId: input.veiculoId,
      tipo: input.tipo,
      data: input.data,
      valor: input.valor.toFixed(2),
      quilometragem: input.quilometragem,
      observacao: input.observacao.trim() || null,
      cadastradoPorAdmin: admin.usuarioAdminId,
    });
  } catch (error) {
    return {
      ok: false,
      error: mensagemErroBanco("registrarGastoVeiculo", error),
    };
  }

  revalidatePath("/veiculos");
  return { ok: true };
}

export async function excluirGastoVeiculo(
  id: string
): Promise<VeiculoActionResult> {
  const admin = await obterAdminAutenticado();
  if (!admin) {
    return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  }

  const limite = await checarRateLimit(
    "excluirGastoVeiculo",
    RATE_LIMIT_ESTRITO
  );
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const db = getDb();
  if (!db) return { ok: false, error: ERRO_BANCO };

  try {
    const [excluido] = await db
      .delete(veiculoGastos)
      .where(eq(veiculoGastos.id, id))
      .returning({ id: veiculoGastos.id });

    if (!excluido) {
      return { ok: false, error: "Gasto não encontrado." };
    }
  } catch (error) {
    return {
      ok: false,
      error: mensagemErroBanco("excluirGastoVeiculo", error),
    };
  }

  revalidatePath("/veiculos");
  return { ok: true };
}
