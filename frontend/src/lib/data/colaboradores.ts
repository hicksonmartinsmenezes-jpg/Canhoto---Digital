// Camada de acesso a dados de Colaboradores no PostgreSQL local via Drizzle.

import { asc } from "drizzle-orm";
import type { PapelColaborador } from "@/types/database";
import { getDb } from "@/lib/db";
import { colaboradores } from "@/lib/db/schema";

export interface ColaboradorListItem {
  id: string;
  nome: string;
  usuario: string | null;
  papel: PapelColaborador;
  ativo: boolean;
  // Só relevante pra papel "gestor_setor" — se já tem usuário e senha
  // definidos (login liberado em /login) ou ainda não.
  temSenha: boolean;
}

export async function getColaboradoresList(): Promise<ColaboradorListItem[]> {
  const db = getDb();
  if (!db) return [];

  const linhas = await db
    .select({
      id: colaboradores.id,
      nome: colaboradores.nome,
      usuario: colaboradores.usuario,
      papel: colaboradores.papel,
      ativo: colaboradores.ativo,
      senhaHash: colaboradores.senhaHash,
    })
    .from(colaboradores)
    .orderBy(asc(colaboradores.nome));

  return linhas.map(({ senhaHash, ...resto }) => ({
    ...resto,
    temSenha: senhaHash !== null,
  }));
}
