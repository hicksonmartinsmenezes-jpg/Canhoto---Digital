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
  latitude: -10.9082,
  longitude: -37.0889,
} as const;


const DESTINOS_CONHECIDOS = [
  {
    termos: ["blue village", "blue village residence"],
    endereco:
      "Avenida Governador Marcelo Déda, 142, Costa Paradiso, Barra dos Coqueiros - SE",
    cep: "49141048",
    latitude: -10.917163,
    longitude: -37.026267,
  },
] as const;

interface BrasilApiCepV2 {
  location?: {
    coordinates?: {
      latitude?: string | number;
      longitude?: string | number;
    };
  };
}

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


function destinoConhecido(endereco: string) {
  const normalizado = normalizarEndereco(endereco);

  return DESTINOS_CONHECIDOS.find((destino) =>
    destino.termos.some((termo) => normalizado.includes(termo))
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


interface OsrmRouteResponse {
  code?: string;
  routes?: Array<{
    distance?: number;
  }>;
}

async function distanciaRodoviariaKm(
  origem: CoordenadasEntrega,
  destino: CoordenadasEntrega
): Promise<number | null> {
  const baseUrl = (
    process.env.ROUTING_URL?.trim() || "https://router.project-osrm.org"
  ).replace(/\/$/, "");

  const coordenadas =
    `${origem.longitude},${origem.latitude};${destino.longitude},${destino.latitude}`;

  try {
    const resposta = await fetch(
      `${baseUrl}/route/v1/driving/${coordenadas}?overview=false&alternatives=false&steps=false`,
      {
        headers: {
          "User-Agent": "Canhoto-Digital/2.0",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(3_000),
      }
    );

    if (!resposta.ok) return null;

    const dados = (await resposta.json()) as OsrmRouteResponse;
    const distanciaMetros = Number(dados.routes?.[0]?.distance);

    if (
      dados.code !== "Ok" ||
      !Number.isFinite(distanciaMetros) ||
      distanciaMetros < 0
    ) {
      return null;
    }

    return Number((distanciaMetros / 1000).toFixed(1));
  } catch {
    return null;
  }
}

async function resolverCoordenadas(
  endereco: string,
  cep: string
): Promise<CoordenadasEntrega | null> {
  const exatas = await geocodificarEntregaGratis({ endereco, cep });
  if (exatas) return exatas;

  return coordenadasPorCep(cep);
}

async function calcularDistanciaLojaAteDestinoKm(
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

  const conhecido = destinoConhecido(entrega.endereco ?? "");

  const destinoResolvido = destinoPersistido
    ? destinoPersistido
    : conhecido
      ? {
          latitude: conhecido.latitude,
          longitude: conhecido.longitude,
        }
      : await resolverCoordenadas(entrega.endereco ?? "", entrega.cep ?? "");

  if (!destinoResolvido) return null;

  const origem = {
    latitude: LOJA_RILDON.latitude,
    longitude: LOJA_RILDON.longitude,
  };

  const distanciaPorRuas = await distanciaRodoviariaKm(
    origem,
    destinoResolvido
  );

  if (distanciaPorRuas !== null) {
    return distanciaPorRuas;
  }

  const distanciaDireta = distanciaHaversineKm(
    origem.latitude,
    origem.longitude,
    destinoResolvido.latitude,
    destinoResolvido.longitude
  );

  return Number(distanciaDireta.toFixed(1));
}

// ---------------------------------------------------------------------------
// Cache em memória. A tela do motorista se atualiza sozinha (router.refresh) e
// cada atualização recalculava a distância: geocodificação + rota no OSRM
// público, com timeouts de vários segundos, a cada poucos segundos. A distância
// loja → destino não muda durante a entrega, então guardamos o resultado e
// juntamos chamadas simultâneas da mesma entrega numa só.
// ---------------------------------------------------------------------------
const TTL_SUCESSO_MS = 60 * 60 * 1000; // 1 h
const TTL_SEM_RESULTADO_MS = 3 * 60 * 1000; // 3 min (tenta de novo depois)
const LIMITE_CACHE = 500;

const cacheDistancia = new Map<
  string,
  { valor: number | null; expiraEm: number }
>();
const calculosEmAndamento = new Map<string, Promise<number | null>>();

function limparCacheExpirado(agora: number) {
  if (cacheDistancia.size < LIMITE_CACHE) return;
  for (const [chave, item] of cacheDistancia) {
    if (item.expiraEm <= agora) cacheDistancia.delete(chave);
  }
  if (cacheDistancia.size >= LIMITE_CACHE) cacheDistancia.clear();
}

export async function getDistanciaLojaAteDestinoKm(
  entregaId: string
): Promise<number | null> {
  const agora = Date.now();
  const guardado = cacheDistancia.get(entregaId);
  if (guardado && guardado.expiraEm > agora) return guardado.valor;

  const emAndamento = calculosEmAndamento.get(entregaId);
  if (emAndamento) return emAndamento;

  const calculo = calcularDistanciaLojaAteDestinoKm(entregaId)
    .catch(() => null)
    .then((valor) => {
      const fim = Date.now();
      limparCacheExpirado(fim);
      cacheDistancia.set(entregaId, {
        valor,
        expiraEm: fim + (valor === null ? TTL_SEM_RESULTADO_MS : TTL_SUCESSO_MS),
      });
      return valor;
    })
    .finally(() => {
      calculosEmAndamento.delete(entregaId);
    });

  calculosEmAndamento.set(entregaId, calculo);
  return calculo;
}
