import "server-only";

import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export type AcaoLogin =
  | "entrarAdmin"
  | "entrarColaborador"
  | "loginMotorista";

function gerarHashIdentificador(acao: AcaoLogin, identificador: string): string {
  const segredoPorAcao: Record<AcaoLogin, string | undefined> = {
    entrarAdmin: process.env.ADMIN_SESSION_SECRET,
    entrarColaborador: process.env.COLABORADOR_SESSION_SECRET,
    loginMotorista: process.env.MOTORISTA_SESSION_SECRET,
  };
  const segredo = segredoPorAcao[acao];
  if (!segredo) {
    throw new Error("Segredo de sessão não configurado para este login.");
  }

  return createHmac("sha256", segredo)
    .update(acao)
    .update(":")
    .update(identificador)
    .digest("hex");
}

/**
 * Reserva atomicamente uma tentativa no PostgreSQL.
 * O banco permite oito tentativas em 15 minutos; a nona inicia bloqueio
 * por mais 15 minutos. O registro sobrevive a reinícios e é compartilhado
 * entre processos da aplicação.
 */
export async function reservarTentativaLogin(
  acao: AcaoLogin,
  identificador: string
): Promise<boolean> {
  const db = getDb();
  if (!db) {
    throw new Error("Banco de dados indisponível para validar o login.");
  }

  const hash = gerarHashIdentificador(acao, identificador);
  const resultado = await db.execute(
    sql<{ permitido: boolean }>`SELECT registrar_tentativa_login(
      ${acao},
      ${hash}
    ) AS permitido`
  );

  const linha = resultado[0] as { permitido?: boolean } | undefined;
  return linha?.permitido === true;
}

/** Limpa o bloqueio após autenticação bem-sucedida. */
export async function limparTentativasLogin(
  acao: AcaoLogin,
  identificador: string
): Promise<void> {
  const db = getDb();
  if (!db) {
    throw new Error("Banco de dados indisponível para limpar o login.");
  }

  const hash = gerarHashIdentificador(acao, identificador);
  await db.execute(
    sql`SELECT limpar_tentativas_login(${acao}, ${hash})`
  );
}
