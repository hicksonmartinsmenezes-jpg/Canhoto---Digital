"use server";

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { colaboradores, usuariosAdmin } from "@/lib/db/schema";
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
import {
  definirCookieSessaoColaborador,
  encerrarSessaoColaborador,
} from "@/lib/colaborador-session";

export interface LoginResult {
  ok: boolean;
  error?: string;
}

const ERRO_CREDENCIAIS = "Usuário ou senha inválidos.";
const ERRO_CONTA_BLOQUEADA =
  "Muitas tentativas para esta conta — aguarde alguns minutos e tente de novo.";

// Hash bcrypt fictício (custo 10) para igualar o tempo de resposta quando o
// usuário não existe.
const HASH_FICTICIO = bcrypt.hashSync("senha-fictícia-sem-uso", 10);

/**
 * Login único do painel. O administrador entra com o e-mail cadastrado como
 * usuário; o colaborador (gestor de setor) entra com o nome de usuário que o
 * admin definiu na tela de Colaboradores.
 */
export async function entrar(
  usuario: string,
  senha: string
): Promise<LoginResult> {
  const limite = await checarRateLimit("entrarAdmin", RATE_LIMIT_ESTRITO);
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const usuarioNormalizado = usuario.trim().toLowerCase();
  if (!usuarioNormalizado) {
    return { ok: false, error: "Informe seu usuário." };
  }
  if (!senha) {
    return { ok: false, error: "Informe sua senha." };
  }
  if (Buffer.byteLength(senha, "utf8") > 72) {
    return { ok: false, error: ERRO_CREDENCIAIS };
  }

  if (contaBloqueadaPorFalhas("entrarAdmin", usuarioNormalizado)) {
    return { ok: false, error: ERRO_CONTA_BLOQUEADA };
  }

  const db = getDb();
  if (!db) {
    return {
      ok: false,
      error: "Banco de dados indisponível neste ambiente.",
    };
  }

  // As duas consultas rodam sempre, para o tempo de resposta não revelar se o
  // usuário é administrador, colaborador ou não existe.
  const [[admin], [colaborador]] = await Promise.all([
    db
      .select({ id: usuariosAdmin.id, senhaHash: usuariosAdmin.senhaHash })
      .from(usuariosAdmin)
      .where(
        and(
          eq(usuariosAdmin.email, usuarioNormalizado),
          eq(usuariosAdmin.ativo, true)
        )
      )
      .limit(1),
    db
      .select({
        id: colaboradores.id,
        senhaHash: colaboradores.senhaHash,
        setorId: colaboradores.setorId,
        papel: colaboradores.papel,
      })
      .from(colaboradores)
      .where(
        and(
          eq(colaboradores.usuario, usuarioNormalizado),
          eq(colaboradores.ativo, true)
        )
      )
      .limit(1),
  ]);

  // Colaborador só entra se for gestor de setor e já tiver senha definida.
  const colaboradorElegivel =
    colaborador &&
    colaborador.papel === "gestor_setor" &&
    colaborador.senhaHash
      ? colaborador
      : null;

  const senhaHash =
    admin?.senhaHash ?? colaboradorElegivel?.senhaHash ?? HASH_FICTICIO;
  const senhaValida = await bcrypt.compare(senha, senhaHash);

  if (!senhaValida || (!admin && !colaboradorElegivel)) {
    registrarFalhaLogin("entrarAdmin", usuarioNormalizado);
    return { ok: false, error: ERRO_CREDENCIAIS };
  }
  limparFalhasLogin("entrarAdmin", usuarioNormalizado);

  // Nunca deixa as duas sessões abertas ao mesmo tempo.
  if (admin) {
    await encerrarSessaoColaborador();
    const sessaoCriada = await definirCookieSessaoAdmin(admin.id);
    if (!sessaoCriada) {
      return {
        ok: false,
        error: "Sessão administrativa não está configurada neste ambiente.",
      };
    }
    return { ok: true };
  }

  await encerrarSessaoAdmin();
  const sessaoCriada = await definirCookieSessaoColaborador(
    colaboradorElegivel!.id,
    colaboradorElegivel!.setorId
  );
  if (!sessaoCriada) {
    return {
      ok: false,
      error: "Sessão de colaborador não está configurada neste ambiente.",
    };
  }
  return { ok: true };
}
