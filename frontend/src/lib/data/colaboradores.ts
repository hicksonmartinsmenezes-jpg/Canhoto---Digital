// Camada de acesso a dados de Colaboradores no PostgreSQL local via Drizzle.

import { asc, eq } from "drizzle-orm";
import type { PapelColaborador } from "@/types/database";
import { getDb } from "@/lib/db";
import { colaboradores, setores } from "@/lib/db/schema";

export interface ColaboradorListItem {
  id: string;
  nome: string;
  usuario: string | null;
  /** Matriz ou Distribuidora (setor do colaborador); null = ainda não definida. */
  unidadeId: string | null;
  unidade: string | null;
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
      unidadeId: colaboradores.setorId,
      unidade: setores.nome,
      papel: colaboradores.papel,
      ativo: colaboradores.ativo,
      senhaHash: colaboradores.senhaHash,
    })
    .from(colaboradores)
    .leftJoin(setores, eq(colaboradores.setorId, setores.id))
    .orderBy(asc(colaboradores.nome));

  return linhas.map(({ senhaHash, ...resto }) => ({
    ...resto,
    temSenha: senhaHash !== null,
  }));
}
