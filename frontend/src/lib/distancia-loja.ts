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

let coordenadasLojaPromise: Promise<CoordenadasEntrega | null> | null = null;

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

function obterCoordenadasLoja(): Promise<CoordenadasEntrega | null> {
  if (!coordenadasLojaPromise) {
    coordenadasLojaPromise = geocodificarEntregaGratis(LOJA_RILDON).then(
      (coordenadas) => {
        if (!coordenadas) {
          coordenadasLojaPromise = null;
        }
        return coordenadas;
      }
    );
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

  const [loja, destinoGeocodificado] = await Promise.all([
    obterCoordenadasLoja(),
    entrega.latitude === null || entrega.longitude === null
      ? geocodificarEntregaGratis({
          endereco: entrega.endereco ?? "",
          cep: entrega.cep ?? "",
        })
      : Promise.resolve(null),
  ]);

  const destino =
    entrega.latitude !== null && entrega.longitude !== null
      ? {
          latitude: Number(entrega.latitude),
          longitude: Number(entrega.longitude),
        }
      : destinoGeocodificado;

  if (!loja || !destino) return null;

  const distanciaKm = distanciaHaversineKm(
    loja.latitude,
    loja.longitude,
    destino.latitude,
    destino.longitude
  );

  return Number(distanciaKm.toFixed(1));
}
