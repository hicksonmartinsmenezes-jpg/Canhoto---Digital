// Camada de acesso a dados de Motoboys no PostgreSQL local via Drizzle.

import { and, asc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  entregas,
  motoboyLocalizacaoHistorico,
  motoboyLocalizacoes,
  motoboys,
} from "@/lib/db/schema";

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

  const inicioMes = new Date();
  inicioMes.setDate(1);
  const inicioMesStr = inicioMes.toISOString().slice(0, 10);

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

export async function getMotoboyNome(id: string): Promise<string | null> {
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

function chaveDataLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function distanciaHaversineKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
): number {
  const raioTerraKm = 6371.0088;
  const rad = (graus: number) => (graus * Math.PI) / 180;
  const deltaLatitude = rad(latitudeB - latitudeA);
  const deltaLongitude = rad(longitudeB - longitudeA);
  const latA = rad(latitudeA);
  const latB = rad(latitudeB);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latA) *
      Math.cos(latB) *
      Math.sin(deltaLongitude / 2) ** 2;

  return 2 * raioTerraKm * Math.asin(Math.min(1, Math.sqrt(a)));
}

async function calcularKmDosPontos(
  motoboyId: string,
  entregaId?: string
): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const hoje = chaveDataLocal(new Date());

  const pontos = await db
    .select({
      entregaId: motoboyLocalizacaoHistorico.entregaId,
      latitude: motoboyLocalizacaoHistorico.latitude,
      longitude: motoboyLocalizacaoHistorico.longitude,
      precisaoMetros: motoboyLocalizacaoHistorico.precisaoMetros,
      registradoEm: motoboyLocalizacaoHistorico.registradoEm,
    })
    .from(motoboyLocalizacaoHistorico)
    .innerJoin(
      entregas,
      eq(motoboyLocalizacaoHistorico.entregaId, entregas.id)
    )
    .where(
      and(
        eq(motoboyLocalizacaoHistorico.motoboyId, motoboyId),
        eq(entregas.data, hoje),
        entregaId
          ? eq(motoboyLocalizacaoHistorico.entregaId, entregaId)
          : undefined
      )
    )
    .orderBy(
      asc(motoboyLocalizacaoHistorico.entregaId),
      asc(motoboyLocalizacaoHistorico.registradoEm)
    );

  let totalKm = 0;
  let anterior:
    | {
        entregaId: string;
        latitude: number;
        longitude: number;
        registradoEm: number;
      }
    | null = null;

  for (const ponto of pontos) {
    const precisao =
      ponto.precisaoMetros === null ? null : Number(ponto.precisaoMetros);

    if (precisao !== null && precisao > 100) {
      anterior = null;
      continue;
    }

    const atual = {
      entregaId: ponto.entregaId,
      latitude: Number(ponto.latitude),
      longitude: Number(ponto.longitude),
      registradoEm: new Date(ponto.registradoEm).getTime(),
    };

    if (
      anterior &&
      anterior.entregaId === atual.entregaId &&
      Number.isFinite(atual.registradoEm)
    ) {
      const distanciaKm = distanciaHaversineKm(
        anterior.latitude,
        anterior.longitude,
        atual.latitude,
        atual.longitude
      );
      const segundos = Math.max(
        1,
        (atual.registradoEm - anterior.registradoEm) / 1000
      );

      // Ignora oscilação pequena do GPS parado e saltos incompatíveis com
      // deslocamento rodoviário normal. O limite equivale a ~180 km/h,
      // com uma margem de 100 m por amostra.
      const limiteKm = segundos * 0.05 + 0.1;
      if (distanciaKm >= 0.015 && distanciaKm <= limiteKm) {
        totalKm += distanciaKm;
      }
    }

    anterior = atual;
  }

  return Number(totalKm.toFixed(1));
}

export async function getKmRodadosHoje(motoboyId: string): Promise<number> {
  return calcularKmDosPontos(motoboyId);
}

export async function getKmRodadosEntrega(
  motoboyId: string,
  entregaId: string
): Promise<number> {
  return calcularKmDosPontos(motoboyId, entregaId);
}

export async function getDistanciaAtualAteDestinoKm(
  motoboyId: string,
  entregaId: string
): Promise<number | null> {
  const db = getDb();
  if (!db) return null;

  const [dados] = await db
    .select({
      destinoLatitude: entregas.latitude,
      destinoLongitude: entregas.longitude,
      motoristaLatitude: motoboyLocalizacoes.latitude,
      motoristaLongitude: motoboyLocalizacoes.longitude,
      localizacaoAtualizadaEm: motoboyLocalizacoes.atualizadoEm,
    })
    .from(entregas)
    .leftJoin(
      motoboyLocalizacoes,
      eq(motoboyLocalizacoes.motoboyId, motoboyId)
    )
    .where(
      and(
        eq(entregas.id, entregaId),
        eq(entregas.motoboyId, motoboyId)
      )
    )
    .limit(1);

  if (
    !dados ||
    dados.destinoLatitude === null ||
    dados.destinoLongitude === null ||
    dados.motoristaLatitude === null ||
    dados.motoristaLongitude === null ||
    dados.localizacaoAtualizadaEm === null
  ) {
    return null;
  }

  const atualizadoEm = new Date(dados.localizacaoAtualizadaEm).getTime();
  if (
    !Number.isFinite(atualizadoEm) ||
    Date.now() - atualizadoEm > 2 * 60 * 1000
  ) {
    return null;
  }

  const distanciaKm = distanciaHaversineKm(
    Number(dados.motoristaLatitude),
    Number(dados.motoristaLongitude),
    Number(dados.destinoLatitude),
    Number(dados.destinoLongitude)
  );

  return Number(distanciaKm.toFixed(1));
}

