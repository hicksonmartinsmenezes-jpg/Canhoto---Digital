"use server";

import bcrypt from "bcryptjs";
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
  // Só usado quando papel === "gestor_setor". Vazio/undefined ao editar =
  // não mexe na senha já salva. Ao criar um gestor_setor, é obrigatório.
  senha?: string;
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

// Retorna o hash pronto pra gravar, ou null se não deve mexer na senha
// atual (edição sem novo valor digitado). "error" só quando o valor
// informado é inválido/insuficiente.
async function resolverSenhaHash(
  papel: PapelColaborador,
  senha: string | undefined,
  { obrigatoria }: { obrigatoria: boolean }
): Promise<{ ok: true; hash: string | null } | { ok: false; error: string }> {
  const senhaLimpa = (senha ?? "").trim();

  if (papel !== "gestor_setor") {
    return { ok: true, hash: null };
  }

  if (!senhaLimpa) {
    if (obrigatoria) {
      return {
        ok: false,
        error: "Defina uma senha de acesso pro Gestor de setor.",
      };
    }
    return { ok: true, hash: null };
  }

  if (senhaLimpa.length < 4) {
    return { ok: false, error: "A senha deve ter pelo menos 4 caracteres." };
  }
  if (Buffer.byteLength(senhaLimpa, "utf8") > 72) {
    return { ok: false, error: "Senha muito longa." };
  }

  return { ok: true, hash: await bcrypt.hash(senhaLimpa, 12) };
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

  const senhaResolvida = await resolverSenhaHash(dados.papel, dados.senha, {
    obrigatoria: true,
  });
  if (!senhaResolvida.ok) {
    return { ok: false, error: senhaResolvida.error };
  }

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
      senhaHash: senhaResolvida.hash,
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

  // Ao editar, senha não é obrigatória — campo vazio significa "manter a
  // senha atual" (mesmo que ainda não exista nenhuma, nesse caso o
  // colaborador simplesmente continua sem conseguir logar até alguém
  // definir uma).
  const senhaResolvida = await resolverSenhaHash(dados.papel, dados.senha, {
    obrigatoria: false,
  });
  if (!senhaResolvida.ok) {
    return { ok: false, error: senhaResolvida.error };
  }

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
        ...(senhaResolvida.hash !== null
          ? { senhaHash: senhaResolvida.hash }
          : {}),
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
