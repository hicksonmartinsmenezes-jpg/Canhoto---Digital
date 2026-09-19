import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";

let sqlClient: Sql | null | undefined;
let database: PostgresJsDatabase<typeof schema> | null | undefined;

/**
 * Cliente PostgreSQL do servidor.
 *
 * Sem DATABASE_URL retornamos null para manter build/CI e telas vazias
 * funcionando enquanto a migração do Supabase ainda está em andamento.
 * Em produção, DATABASE_URL é obrigatória.
 */
export function getDb(): PostgresJsDatabase<typeof schema> | null {
  if (database !== undefined) return database;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    database = null;
    return database;
  }

  sqlClient = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  database = drizzle(sqlClient, { schema });
  return database;
}

/**
 * Usado somente por rotinas de encerramento/teste que precisem fechar
 * explicitamente o pool do postgres.js.
 */
export async function fecharDb(): Promise<void> {
  if (sqlClient) {
    await sqlClient.end({ timeout: 5 });
  }
  sqlClient = undefined;
  database = undefined;
}
