"use server";

import { eq, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { exigirAdminAutenticado } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { codigoErroPostgres, mensagemErroBanco } from "@/lib/db/errors";
import { colaboradores, setores } from "@/lib/db/schema";
import { checarRateLimit, RATE_LIMIT_ESTRITO } from "@/lib/rate-limit";
import { normalizarTelefone } from "@/lib/motorista-auth";
import type { PapelColaborador } from "@/types/database";

export interface ColaboradorActionResult {
  ok: boolean;
  error?: string;
}

export interface ColaboradorDados {
  nome: string;
  email: string;
  celular: string;
  cargo: string;
  papel: PapelColaborador;
  ativo: boolean;
}

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOME_SETOR_PADRAO = "Expedição";
const ERRO_BANCO =
  "Banco de dados indisponível neste ambiente — confirme a DATABASE_URL.";

function validarDados(
  dados: ColaboradorDados
):
  | {
      ok: true;
      nome: string;
      email: string;
      celular: string;
      cargo: string;
    }
  | { ok: false; error: string } {
  const nome = dados.nome.trim();
  if (!nome) {
    return { ok: false, error: "Informe o nome do colaborador." };
  }

  const email = dados.email.trim().toLowerCase();
  if (!email) {
    return { ok: false, error: "Informe o e-mail do colaborador." };
  }
  if (!REGEX_EMAIL.test(email)) {
    return { ok: false, error: "Informe um e-mail válido." };
  }

  const celular = normalizarTelefone(dados.celular);
  if (celular.length !== 10 && celular.length !== 11) {
    return { ok: false, error: "Informe um celular válido, com DDD." };
  }

  return {
    ok: true,
    nome,
    email,
    celular,
    cargo: dados.cargo.trim(),
  };
}

async function obterSetorPadrao(): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  const [existente] = await db
    .select({ id: setores.id })
    .from(setores)
    .where(ilike(setores.nome, NOME_SETOR_PADRAO))
    .limit(1);

  if (existente) return existente.id;

  const [criado] = await db
    .insert(setores)
    .values({ nome: NOME_SETOR_PADRAO })
    .returning({ id: setores.id });

  return criado?.id ?? null;
}

export async function criarColaborador(
  dados: ColaboradorDados
): Promise<ColaboradorActionResult> {
  if (!(await exigirAdminAutenticado())) {
    return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  }

  const limite = await checarRateLimit("criarColaborador");
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const db = getDb();
  if (!db) return { ok: false, error: ERRO_BANCO };

  const validado = validarDados(dados);
  if (!validado.ok) return { ok: false, error: validado.error };

  try {
    const setorId = await obterSetorPadrao();
    if (!setorId) {
      return { ok: false, error: "Não foi possível localizar o setor padrão." };
    }

    await db.insert(colaboradores).values({
      nome: validado.nome,
      email: validado.email,
      celular: validado.celular,
      setorId,
      cargo: validado.cargo || null,
      papel: dados.papel,
    });
  } catch (error) {
    if (codigoErroPostgres(error) === "23505") {
      return {
        ok: false,
        error: "Esse e-mail já está cadastrado para outro colaborador.",
      };
    }
    return {
      ok: false,
      error: mensagemErroBanco("criarColaborador", error),
    };
  }

  revalidatePath("/colaboradores");
  return { ok: true };
}

export async function atualizarColaborador(
  id: string,
  dados: ColaboradorDados
): Promise<ColaboradorActionResult> {
  if (!(await exigirAdminAutenticado())) {
    return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  }

  const limite = await checarRateLimit("atualizarColaborador");
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const db = getDb();
  if (!db) return { ok: false, error: ERRO_BANCO };

  const validado = validarDados(dados);
  if (!validado.ok) return { ok: false, error: validado.error };

  try {
    const setorId = await obterSetorPadrao();
    if (!setorId) {
      return { ok: false, error: "Não foi possível localizar o setor padrão." };
    }

    const [atualizado] = await db
      .update(colaboradores)
      .set({
        nome: validado.nome,
        email: validado.email,
        celular: validado.celular,
        setorId,
        cargo: validado.cargo || null,
        papel: dados.papel,
        ativo: dados.ativo,
      })
      .where(eq(colaboradores.id, id))
      .returning({ id: colaboradores.id });

    if (!atualizado) {
      return { ok: false, error: "Colaborador não encontrado." };
    }
  } catch (error) {
    if (codigoErroPostgres(error) === "23505") {
      return {
        ok: false,
        error: "Esse e-mail já está cadastrado para outro colaborador.",
      };
    }
    return {
      ok: false,
      error: mensagemErroBanco("atualizarColaborador", error),
    };
  }

  revalidatePath("/colaboradores");
  return { ok: true };
}

export async function excluirColaborador(
  id: string
): Promise<ColaboradorActionResult> {
  if (!(await exigirAdminAutenticado())) {
    return { ok: false, error: "Sessão administrativa inválida ou expirada." };
  }

  const limite = await checarRateLimit(
    "excluirColaborador",
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
      .delete(colaboradores)
      .where(eq(colaboradores.id, id))
      .returning({ id: colaboradores.id });

    if (!excluido) {
      return { ok: false, error: "Colaborador não encontrado." };
    }
  } catch (error) {
    if (codigoErroPostgres(error) === "23503") {
      return {
        ok: false,
        error:
          "Esse colaborador já está referenciado em outros registros — desative em vez de excluir.",
      };
    }
    return {
      ok: false,
      error: mensagemErroBanco("excluirColaborador", error),
    };
  }

  revalidatePath("/colaboradores");
  return { ok: true };
}
