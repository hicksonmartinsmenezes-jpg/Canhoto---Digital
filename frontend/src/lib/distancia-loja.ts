import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { entregas } from "@/lib/db/schema";
import {
  geocodificarEntregaGratis,
  type CoordenadasEntrega,
} from "@/lib/geocodificacao-gratis";

const LOJA_RILDON = {
  endereco:
    "Avenida Chanceler Osvaldo Aranha, 151, Novo Paraíso, Aracaju - SE",
  cep: "49082110",
} as const;

interface BrasilApiCepV2 {
  location?: {
    coordinates?: {
      latitude?: string | number;
      longitude?: string | number;
    };
  };
}

let coordenadasLojaPromise: Promise<CoordenadasEntrega | null> | null = null;

function normalizarEndereco(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function destinoEhALoja(endereco: string): boolean {
  const normalizado = normalizarEndereco(endereco);

  return (
    normalizado === "rildon eletropecas" ||
    normalizado.includes("rildon eletropecas") ||
    normalizado.includes("chanceler osvaldo aranha 151")
  );
}

function coordenadasValidas(
  latitude: number,
  longitude: number
): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

async function coordenadasPorCep(
  cepEntrada: string
): Promise<CoordenadasEntrega | null> {
  const cep = cepEntrada.replace(/\D/g, "");
  if (!/^\d{8}$/.test(cep)) return null;

  try {
    const resposta = await fetch(
      `https://brasilapi.com.br/api/cep/v2/${cep}`,
      {
        headers: {
          "User-Agent": "Canhoto-Digital/2.0",
        },
        next: {
          revalidate: 60 * 60 * 24 * 30,
        },
        signal: AbortSignal.timeout(5_000),
      }
    );

    if (!resposta.ok) return null;

    const dados = (await resposta.json()) as BrasilApiCepV2;
    const latitude = Number(dados.location?.coordinates?.latitude);
    const longitude = Number(dados.location?.coordinates?.longitude);

    if (!coordenadasValidas(latitude, longitude)) {
      return null;
    }

    return {
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
    };
  } catch {
    return null;
  }
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

async function resolverCoordenadas(
  endereco: string,
  cep: string
): Promise<CoordenadasEntrega | null> {
  const exatas = await geocodificarEntregaGratis({ endereco, cep });
  if (exatas) return exatas;

  return coordenadasPorCep(cep);
}

function obterCoordenadasLoja(): Promise<CoordenadasEntrega | null> {
  if (!coordenadasLojaPromise) {
    coordenadasLojaPromise = resolverCoordenadas(
      LOJA_RILDON.endereco,
      LOJA_RILDON.cep
    ).then((coordenadas) => {
      if (!coordenadas) {
        coordenadasLojaPromise = null;
      }
      return coordenadas;
    });
  }

  return coordenadasLojaPromise;
}

export async function getDistanciaLojaAteDestinoKm(
  entregaId: string
): Promise<number | null> {
  const db = getDb();
  if (!db) return null;

  const [entrega] = await db
    .select({
      latitude: entregas.latitude,
      longitude: entregas.longitude,
      endereco: entregas.endereco,
      cep: entregas.cep,
    })
    .from(entregas)
    .where(eq(entregas.id, entregaId))
    .limit(1);

  if (!entrega) return null;

  if (destinoEhALoja(entrega.endereco ?? "")) {
    return 0;
  }

  const destinoPersistido =
    entrega.latitude !== null && entrega.longitude !== null
      ? {
          latitude: Number(entrega.latitude),
          longitude: Number(entrega.longitude),
        }
      : null;

  const [loja, destinoResolvido] = await Promise.all([
    obterCoordenadasLoja(),
    destinoPersistido
      ? Promise.resolve(destinoPersistido)
      : resolverCoordenadas(entrega.endereco ?? "", entrega.cep ?? ""),
  ]);

  if (!loja || !destinoResolvido) return null;

  const distanciaKm = distanciaHaversineKm(
    loja.latitude,
    loja.longitude,
    destinoResolvido.latitude,
    destinoResolvido.longitude
  );

  return Number(distanciaKm.toFixed(1));
}
