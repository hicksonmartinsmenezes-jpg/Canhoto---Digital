"use server";

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { colaboradores } from "@/lib/db/schema";
import { checarRateLimit, RATE_LIMIT_ESTRITO } from "@/lib/rate-limit";
import { normalizarTelefone } from "@/lib/motorista-auth";
import {
  definirCookieSessaoColaborador,
  encerrarSessaoColaborador,
} from "@/lib/colaborador-session";

export interface LoginColaboradorResult {
  ok: boolean;
  error?: string;
}

const ERRO_CREDENCIAIS = "Celular ou senha inválidos.";

export async function entrarColaborador(
  celular: string,
  senha: string
): Promise<LoginColaboradorResult> {
  const limite = await checarRateLimit(
    "entrarColaborador",
    RATE_LIMIT_ESTRITO
  );
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const celularNormalizado = normalizarTelefone(celular);
  if (!celularNormalizado) {
    return { ok: false, error: "Informe seu celular." };
  }
  if (!senha) {
    return { ok: false, error: "Informe sua senha." };
  }
  if (Buffer.byteLength(senha, "utf8") > 72) {
    return { ok: false, error: ERRO_CREDENCIAIS };
  }

  const db = getDb();
  if (!db) {
    return {
      ok: false,
      error: "Banco de dados indisponível neste ambiente.",
    };
  }

  const [colaborador] = await db
    .select({
      id: colaboradores.id,
      senhaHash: colaboradores.senhaHash,
      setorId: colaboradores.setorId,
      papel: colaboradores.papel,
    })
    .from(colaboradores)
    .where(
      and(
        eq(colaboradores.celular, celularNormalizado),
        eq(colaboradores.ativo, true)
      )
    )
    .limit(1);

  // Só colaborador com papel "gestor_setor" E com senha definida pode
  // logar aqui — um colaborador comum (papel "colaborador") cadastrado só
  // como registro/diretório não tem acesso, mesmo que por algum motivo
  // tenha um senha_hash preenchido.
  if (
    !colaborador ||
    colaborador.papel !== "gestor_setor" ||
    !colaborador.senhaHash
  ) {
    return { ok: false, error: ERRO_CREDENCIAIS };
  }

  const senhaValida = await bcrypt.compare(senha, colaborador.senhaHash);
  if (!senhaValida) {
    return { ok: false, error: ERRO_CREDENCIAIS };
  }

  const sessaoCriada = await definirCookieSessaoColaborador(
    colaborador.id,
    colaborador.setorId
  );
  if (!sessaoCriada) {
    return {
      ok: false,
      error: "Sessão de colaborador não está configurada neste ambiente.",
    };
  }

  return { ok: true };
}

async function sairColaborador(): Promise<void> {
  await encerrarSessaoColaborador();
  redirect("/colaborador/login");
}
