// Camada de acesso a dados de Motoboys no PostgreSQL local via Drizzle.

import { and, asc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { entregas, motoboys } from "@/lib/db/schema";

export interface MotoboyOption {
  id: string;
  nome: string;
}

export async function getMotoboys(): Promise<MotoboyOption[]> {
  const db = getDb();
  if (!db) return [];

  return db
    .select({
      id: motoboys.id,
      nome: motoboys.nome,
    })
    .from(motoboys)
    .where(eq(motoboys.ativo, true))
    .orderBy(asc(motoboys.nome));
}

export interface MotoboyListItem {
  id: string;
  nome: string;
  ativo: boolean;
  entregasNoMes: number;
  telefone: string | null;
  temPin: boolean;
}

export async function getMotoboysList(): Promise<MotoboyListItem[]> {
  const db = getDb();
  if (!db) return [];

  // Dia 1 do mês em horário LOCAL — toISOString() converte pra UTC e, à
  // noite (UTC-3), empurrava o início do mês pro dia 2.
  const hoje = new Date();
  const inicioMesStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;

  const [lista, contagens] = await Promise.all([
    db
      .select({
        id: motoboys.id,
        nome: motoboys.nome,
        ativo: motoboys.ativo,
        telefone: motoboys.telefone,
        pinHash: motoboys.pinHash,
      })
      .from(motoboys)
      .orderBy(asc(motoboys.nome)),
    db
      .select({
        motoboyId: entregas.motoboyId,
        total: sql<number>`count(*)::int`,
      })
      .from(entregas)
      .where(
        and(
          gte(entregas.data, inicioMesStr),
          isNotNull(entregas.motoboyId)
        )
      )
      .groupBy(entregas.motoboyId),
  ]);

  const contagem = new Map<string, number>();
  for (const item of contagens) {
    if (item.motoboyId) contagem.set(item.motoboyId, item.total);
  }

  return lista.map((m) => ({
    id: m.id,
    nome: m.nome,
    ativo: m.ativo,
    entregasNoMes: contagem.get(m.id) ?? 0,
    telefone: m.telefone,
    temPin: m.pinHash !== null,
  }));
}

export interface MotoboyAuth {
  id: string;
  pinHash: string | null;
  ativo: boolean;
}

export async function getMotoboyPorTelefone(
  telefone: string
): Promise<MotoboyAuth | null> {
  const db = getDb();
  if (!db) return null;

  const [motoboy] = await db
    .select({
      id: motoboys.id,
      pinHash: motoboys.pinHash,
      ativo: motoboys.ativo,
    })
    .from(motoboys)
    .where(eq(motoboys.telefone, telefone))
    .limit(1);

  return motoboy ?? null;
}

async function getMotoboyNome(id: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  const [motoboy] = await db
    .select({ nome: motoboys.nome })
    .from(motoboys)
    .where(eq(motoboys.id, id))
    .limit(1);

  return motoboy?.nome ?? null;
}


export interface MotoboyPerfil {
  nome: string;
  telefone: string | null;
  ativo: boolean;
}

export async function getMotoboyPerfil(
  id: string
): Promise<MotoboyPerfil | null> {
  const db = getDb();
  if (!db) return null;

  const [motoboy] = await db
    .select({
      nome: motoboys.nome,
      telefone: motoboys.telefone,
      ativo: motoboys.ativo,
    })
    .from(motoboys)
    .where(eq(motoboys.id, id))
    .limit(1);

  return motoboy ?? null;
}
