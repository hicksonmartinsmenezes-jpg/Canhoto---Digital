// Camada de acesso a dados de Colaboradores no PostgreSQL local via Drizzle.

import { asc } from "drizzle-orm";
import type { PapelColaborador } from "@/types/database";
import { getDb } from "@/lib/db";
import { colaboradores } from "@/lib/db/schema";

export interface ColaboradorListItem {
  id: string;
  nome: string;
  email: string | null;
  celular: string | null;
  cargo: string | null;
  papel: PapelColaborador;
  ativo: boolean;
}

export async function getColaboradoresList(): Promise<ColaboradorListItem[]> {
  const db = getDb();
  if (!db) return [];

  return db
    .select({
      id: colaboradores.id,
      nome: colaboradores.nome,
      email: colaboradores.email,
      celular: colaboradores.celular,
      cargo: colaboradores.cargo,
      papel: colaboradores.papel,
      ativo: colaboradores.ativo,
    })
    .from(colaboradores)
    .orderBy(asc(colaboradores.nome));
}
