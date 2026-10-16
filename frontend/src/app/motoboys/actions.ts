"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { exigirAdminAutenticado } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { codigoErroPostgres, mensagemErroBanco } from "@/lib/db/errors";
import { motoboyLocalizacoes, motoboys } from "@/lib/db/schema";
import { checarRateLimit, RATE_LIMIT_ESTRITO } from "@/lib/rate-limit";
import { gerarPin, hashPin, normalizarTelefone } from "@/lib/motorista-auth";

export interface MotoboyActionResult {
  ok: boolean;
  error?: string;
}

const ERRO_BANCO =
  "Banco de dados indisponível neste ambiente — confirme a DATABASE_URL.";

export async function criarMotoboy(
  nome: string,
  telefone: string
): Promise<MotoboyActionResult> {
  if (!(await exigirAdminAutenticado())) {
    return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  }

  const limite = await checarRateLimit("criarMotoboy");
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const db = getDb();
  if (!db) return { ok: false, error: ERRO_BANCO };

  const nomeLimpo = nome.trim();
  if (!nomeLimpo) {
    return { ok: false, error: "Informe o nome do motoboy." };
  }

  const telefoneLimpo = normalizarTelefone(telefone);

  try {
    await db.insert(motoboys).values({
      nome: nomeLimpo,
      telefone: telefoneLimpo || null,
    });
  } catch (error) {
    if (codigoErroPostgres(error) === "23505") {
      return {
        ok: false,
        error: "Esse telefone já está cadastrado para outro motorista.",
      };
    }
    return {
      ok: false,
      error: mensagemErroBanco("criarMotoboy", error),
    };
  }

  revalidatePath("/motoboys");
  return { ok: true };
}

export async function atualizarMotoboy(
  id: string,
  dados: { nome: string; telefone: string; ativo: boolean }
): Promise<MotoboyActionResult> {
  if (!(await exigirAdminAutenticado())) {
    return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  }

  const limite = await checarRateLimit("atualizarMotoboy");
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const db = getDb();
  if (!db) return { ok: false, error: ERRO_BANCO };

  const nomeLimpo = dados.nome.trim();
  if (!nomeLimpo) {
    return { ok: false, error: "Informe o nome do motoboy." };
  }

  const telefoneLimpo = normalizarTelefone(dados.telefone);

  try {
    const [atualizado] = await db
      .update(motoboys)
      .set({
        nome: nomeLimpo,
        telefone: telefoneLimpo || null,
        ativo: dados.ativo,
      })
      .where(eq(motoboys.id, id))
      .returning({ id: motoboys.id });

    if (!atualizado) {
      return { ok: false, error: "Motorista não encontrado." };
    }

    // Motorista desativado não deve continuar aparecendo no mapa "em rota".
    if (!dados.ativo) {
      await db
        .delete(motoboyLocalizacoes)
        .where(eq(motoboyLocalizacoes.motoboyId, id));
    }
  } catch (error) {
    if (codigoErroPostgres(error) === "23505") {
      return {
        ok: false,
        error: "Esse telefone já está cadastrado para outro motorista.",
      };
    }
    return {
      ok: false,
      error: mensagemErroBanco("atualizarMotoboy", error),
    };
  }

  revalidatePath("/motoboys");
  revalidatePath("/canhotos");
  return { ok: true };
}

export async function excluirMotoboy(
  id: string
): Promise<MotoboyActionResult> {
  if (!(await exigirAdminAutenticado())) {
    return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  }

  const limite = await checarRateLimit("excluirMotoboy", RATE_LIMIT_ESTRITO);
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
      .delete(motoboys)
      .where(eq(motoboys.id, id))
      .returning({ id: motoboys.id });

    if (!excluido) {
      return { ok: false, error: "Motorista não encontrado." };
    }
  } catch (error) {
    if (codigoErroPostgres(error) === "23503") {
      return {
        ok: false,
        error:
          "Esse motoboy já tem entregas registradas — desative em vez de excluir.",
      };
    }
    return {
      ok: false,
      error: mensagemErroBanco("excluirMotoboy", error),
    };
  }

  revalidatePath("/motoboys");
  return { ok: true };
}

export interface GerarPinResult extends MotoboyActionResult {
  pin?: string;
}

export async function gerarPinMotoboy(
  id: string
): Promise<GerarPinResult> {
  if (!(await exigirAdminAutenticado())) {
    return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  }

  const limite = await checarRateLimit(
    "gerarPinMotoboy",
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

  const [motoboy] = await db
    .select({ telefone: motoboys.telefone })
    .from(motoboys)
    .where(eq(motoboys.id, id))
    .limit(1);

  if (!motoboy) {
    return { ok: false, error: "Motorista não encontrado." };
  }
  if (!motoboy.telefone) {
    return {
      ok: false,
      error: "Cadastre o telefone do motorista antes de gerar o PIN.",
    };
  }

  const pin = gerarPin();

  try {
    await db
      .update(motoboys)
      .set({ pinHash: hashPin(pin) })
      .where(eq(motoboys.id, id));
  } catch (error) {
    return {
      ok: false,
      error: mensagemErroBanco("gerarPinMotoboy", error),
    };
  }

  revalidatePath("/motoboys");
  return { ok: true, pin };
}
