"use server";

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { usuariosAdmin } from "@/lib/db/schema";
import {
  checarRateLimit,
  contaBloqueadaPorFalhas,
  limparFalhasLogin,
  RATE_LIMIT_ESTRITO,
  registrarFalhaLogin,
} from "@/lib/rate-limit";
import {
  definirCookieSessaoAdmin,
  encerrarSessaoAdmin,
} from "@/lib/admin-session";

export interface LoginAdminResult {
  ok: boolean;
  error?: string;
}

const ERRO_CREDENCIAIS = "E-mail ou senha inválidos.";
const ERRO_CONTA_BLOQUEADA =
  "Muitas tentativas para esta conta — aguarde alguns minutos e tente de novo.";

// Hash bcrypt fictício (custo 10) para igualar o tempo de resposta quando o
// e-mail não existe.
const HASH_FICTICIO = bcrypt.hashSync("senha-fictícia-sem-uso", 10);

export async function entrarAdmin(
  email: string,
  senha: string
): Promise<LoginAdminResult> {
  const limite = await checarRateLimit("entrarAdmin", RATE_LIMIT_ESTRITO);
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const emailNormalizado = email.trim().toLowerCase();
  if (!emailNormalizado) {
    return { ok: false, error: "Informe seu e-mail." };
  }
  if (!senha) {
    return { ok: false, error: "Informe sua senha." };
  }
  if (Buffer.byteLength(senha, "utf8") > 72) {
    return { ok: false, error: ERRO_CREDENCIAIS };
  }

  if (contaBloqueadaPorFalhas("entrarAdmin", emailNormalizado)) {
    return { ok: false, error: ERRO_CONTA_BLOQUEADA };
  }

  const db = getDb();
  if (!db) {
    return {
      ok: false,
      error: "Banco de dados indisponível neste ambiente.",
    };
  }

  const [usuario] = await db
    .select({
      id: usuariosAdmin.id,
      senhaHash: usuariosAdmin.senhaHash,
    })
    .from(usuariosAdmin)
    .where(
      and(
        eq(usuariosAdmin.email, emailNormalizado),
        eq(usuariosAdmin.ativo, true)
      )
    )
    .limit(1);

  const senhaValida = await bcrypt.compare(
    senha,
    usuario?.senhaHash ?? HASH_FICTICIO
  );
  if (!usuario || !senhaValida) {
    registrarFalhaLogin("entrarAdmin", emailNormalizado);
    return { ok: false, error: ERRO_CREDENCIAIS };
  }
  limparFalhasLogin("entrarAdmin", emailNormalizado);

  const sessaoCriada = await definirCookieSessaoAdmin(usuario.id);
  if (!sessaoCriada) {
    return {
      ok: false,
      error: "Sessão administrativa não está configurada neste ambiente.",
    };
  }

  return { ok: true };
}

async function sairAdmin(): Promise<void> {
  await encerrarSessaoAdmin();
  redirect("/login");
}
