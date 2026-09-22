import "server-only";

interface BrasilApiCep {
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
}

interface PhotonFeature {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    countrycode?: string;
    postcode?: string;
    housenumber?: string;
    street?: string;
    name?: string;
    district?: string;
    locality?: string;
    city?: string;
    state?: string;
  };
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

interface GeocodebrResponse {
  ok?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  precisao?: string | null;
  tipo_resultado?: string | null;
  desvio_metros?: number | null;
  endereco_encontrado?: string | null;
  motivo?: string | null;
  fonte?: string;
}

export interface CoordenadasEntrega {
  latitude: number;
  longitude: number;
}

function somenteDigitos(valor: string | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}

function extrairNumero(endereco: string): string {
  const candidatos = endereco.match(/\b\d+[A-Za-z]?\b/g);
  return candidatos?.at(-1) ?? "";
}

const TERMOS_GENERICOS = new Set([
  "RUA",
  "R",
  "AV",
  "AVENIDA",
  "TRAVESSA",
  "TV",
  "ESTRADA",
  "RODOVIA",
  "ROD",
  "LOTEAMENTO",
  "LOT",
  "CONJUNTO",
  "CJ",
  "RESIDENCIAL",
  "RES",
  "BAIRRO",
  "N",
  "NUMERO",
]);

function normalizarTexto(valor: string | undefined): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function tokensRelevantes(valor: string | undefined): Set<string> {
  return new Set(
    normalizarTexto(valor)
      .split(" ")
      .filter(
        (token) =>
          token &&
          !TERMOS_GENERICOS.has(token) &&
          !/^\d+$/.test(token)
      )
  );
}

function contextoPhotonCompativel(
  endereco: string,
  props: NonNullable<PhotonFeature["properties"]>
): boolean {
  const tokensEndereco = tokensRelevantes(endereco);
  const tokensRua = tokensRelevantes(props.street || props.name);
  const extras = [...tokensEndereco].filter(
    (token) => !tokensRua.has(token)
  );

  if (extras.length === 0) return true;

  const contexto = [
    props.district,
    props.locality,
    props.city,
    props.state,
  ]
    .filter(Boolean)
    .join(" ");

  const tokensContexto = tokensRelevantes(contexto);
  return extras.some((token) => tokensContexto.has(token));
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

async function geocodificarComGeocodebr(
  endereco: string,
  cep: string
): Promise<CoordenadasEntrega | null> {
  if (!endereco || !/^\d{8}$/.test(cep)) return null;

  const baseUrl = (
    process.env.GEOCODER_URL?.trim() || "http://127.0.0.1:8001"
  ).replace(/\/$/, "");

  try {
    const resposta = await fetch(`${baseUrl}/geocode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endereco,
        cep,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!resposta.ok) return null;

    const dados = (await resposta.json()) as GeocodebrResponse;
    const latitude = Number(dados.latitude);
    const longitude = Number(dados.longitude);

    if (
      dados.ok !== true ||
      !coordenadasValidas(latitude, longitude)
    ) {
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

async function consultarCep(cep: string): Promise<BrasilApiCep | null> {
  if (!/^\d{8}$/.test(cep)) return null;

  try {
    const resposta = await fetch(
      `https://brasilapi.com.br/api/cep/v1/${cep}`,
      {
        headers: {
          "User-Agent": "Canhoto-Digital/1.0",
        },
        next: {
          revalidate: 60 * 60 * 24 * 30,
        },
        signal: AbortSignal.timeout(4_000),
      }
    );

    if (!resposta.ok) return null;
    return (await resposta.json()) as BrasilApiCep;
  } catch {
    return null;
  }
}

function aceitarResultadoPhoton(
  feature: PhotonFeature,
  endereco: string,
  numeroInformado: string,
  cep: string
): CoordenadasEntrega | null {
  const [longitude, latitude] = feature.geometry?.coordinates ?? [];
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !coordenadasValidas(latitude, longitude)
  ) {
    return null;
  }

  const props = feature.properties;
  if (props?.countrycode?.toUpperCase() !== "BR") return null;
  if (!props || !contextoPhotonCompativel(endereco, props)) return null;

  if (numeroInformado) {
    const numeroResultado = (props?.housenumber ?? "")
      .trim()
      .toLocaleLowerCase("pt-BR");

    if (
      !numeroResultado ||
      numeroResultado !== numeroInformado.toLocaleLowerCase("pt-BR")
    ) {
      return null;
    }
  }

  if (cep && props?.postcode) {
    const cepResultado = somenteDigitos(props.postcode);
    if (cepResultado && cepResultado !== cep) return null;
  }

  return {
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
  };
}

async function buscarPhoton(
  endpoint: "structured" | "api",
  params: URLSearchParams,
  endereco: string,
  numeroInformado: string,
  cep: string
): Promise<CoordenadasEntrega | null> {
  try {
    const resposta = await fetch(
      `https://photon.komoot.io/${endpoint}?${params.toString()}`,
      {
        headers: {
          "User-Agent": "Canhoto-Digital/1.0",
          "Accept-Language": "pt-BR,pt;q=0.9",
        },
        cache: "force-cache",
        signal: AbortSignal.timeout(5_000),
      }
    );

    if (!resposta.ok) return null;

    const dados = (await resposta.json()) as PhotonResponse;
    for (const feature of dados.features ?? []) {
      const coordenadas = aceitarResultadoPhoton(
        feature,
        endereco,
        numeroInformado,
        cep
      );
      if (coordenadas) return coordenadas;
    }

    return null;
  } catch {
    return null;
  }
}

async function geocodificarComPhoton(
  endereco: string,
  cep: string
): Promise<CoordenadasEntrega | null> {
  const numero = extrairNumero(endereco);
  const cepInfo = await consultarCep(cep);

  const params = new URLSearchParams({
    countrycode: "BR",
    limit: "3",
    lang: "pt",
  });

  const rua = cepInfo?.street?.trim() || endereco;
  params.set("street", rua);

  if (numero) params.set("housenumber", numero);
  if (cep) params.set("postcode", cep);
  if (cepInfo?.neighborhood) {
    params.set("district", cepInfo.neighborhood);
  }
  if (cepInfo?.city) params.set("city", cepInfo.city);
  if (cepInfo?.state) params.set("state", cepInfo.state);

  const estruturado = await buscarPhoton(
    "structured",
    params,
    endereco,
    numero,
    cep
  );
  if (estruturado) return estruturado;

  const consultaLivre = [
    endereco,
    cepInfo?.neighborhood,
    cepInfo?.city,
    cepInfo?.state,
    cep ? `CEP ${cep}` : "",
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");

  const paramsLivres = new URLSearchParams({
    q: consultaLivre,
    countrycode: "BR",
    limit: "5",
    lang: "pt",
  });

  return buscarPhoton("api", paramsLivres, endereco, numero, cep);
}

/**
 * Geocodificação automática sem API paga.
 *
 * 1. geocodebr/CNEFE local: fonte principal, específica para endereços
 *    brasileiros e executada no nosso próprio Docker.
 * 2. Photon/OpenStreetMap: fallback quando o resultado local não atingir
 *    o nível de confiança exigido ou o serviço estiver indisponível.
 *
 * Se nenhuma fonte retornar um ponto confiável, a entrega continua sem
 * coordenadas e o motorista usa o endereço textual no Waze.
 */
export async function geocodificarEntregaGratis(input: {
  endereco: string;
  cep: string;
}): Promise<CoordenadasEntrega | null> {
  const endereco = input.endereco.trim();
  const cep = somenteDigitos(input.cep);

  if (!endereco) return null;

  const local = await geocodificarComGeocodebr(endereco, cep);
  if (local) return local;

  return geocodificarComPhoton(endereco, cep);
}
