import "server-only";

export interface CoordenadasEntrega {
  latitude: string;
  longitude: string;
  fonte: "google" | "brasilapi_cep";
}

interface GoogleGeocodeResponse {
  status?: string;
  results?: Array<{
    partial_match?: boolean;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
    address_components?: Array<{
      short_name?: string;
      types?: string[];
    }>;
  }>;
}

interface BrasilApiCepResponse {
  location?: {
    coordinates?: {
      latitude?: string | number;
      longitude?: string | number;
    };
  };
}

function coordenadaValida(
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

function formatarCoordenadas(
  latitude: number,
  longitude: number,
  fonte: CoordenadasEntrega["fonte"]
): CoordenadasEntrega {
  return {
    latitude: latitude.toFixed(6),
    longitude: longitude.toFixed(6),
    fonte,
  };
}

async function geocodificarComGoogle(
  endereco: string,
  cep: string
): Promise<CoordenadasEntrega | null> {
  const apiKey = process.env.GOOGLE_MAPS_GEOCODING_API_KEY?.trim();
  if (!apiKey || !endereco) return null;

  try {
    const params = new URLSearchParams({
      address: [endereco, cep ? `CEP ${cep}` : "", "Brasil"]
        .filter(Boolean)
        .join(", "),
      components: "country:BR",
      region: "br",
      language: "pt-BR",
      key: apiKey,
    });

    const resposta = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      }
    );

    if (!resposta.ok) return null;

    const dados = (await resposta.json()) as GoogleGeocodeResponse;
    if (dados.status !== "OK") return null;

    const resultado = dados.results?.[0];
    const localizacao = resultado?.geometry?.location;
    if (!localizacao) return null;

    const pais = resultado.address_components
      ?.find((componente) => componente.types?.includes("country"))
      ?.short_name?.toUpperCase();

    if (pais && pais !== "BR") return null;

    const latitude = Number(localizacao.lat);
    const longitude = Number(localizacao.lng);
    if (!coordenadaValida(latitude, longitude)) return null;

    return formatarCoordenadas(latitude, longitude, "google");
  } catch {
    return null;
  }
}

async function geocodificarComBrasilApi(
  cep: string
): Promise<CoordenadasEntrega | null> {
  if (!/^\d{8}$/.test(cep)) return null;

  try {
    const resposta = await fetch(
      `https://brasilapi.com.br/api/cep/v2/${cep}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      }
    );

    if (!resposta.ok) return null;

    const dados = (await resposta.json()) as BrasilApiCepResponse;
    const latitude = Number(dados.location?.coordinates?.latitude);
    const longitude = Number(dados.location?.coordinates?.longitude);

    if (!coordenadaValida(latitude, longitude)) return null;

    return formatarCoordenadas(latitude, longitude, "brasilapi_cep");
  } catch {
    return null;
  }
}

/**
 * Resolve o endereço uma única vez no cadastro/edição e persiste o ponto.
 *
 * Prioridade:
 * 1. Google Geocoding, quando GOOGLE_MAPS_GEOCODING_API_KEY estiver definida,
 *    pois considera o endereço completo e tende a resolver número/logradouro.
 * 2. BrasilAPI CEP v2 como fallback gratuito; suas coordenadas representam o
 *    CEP e podem ser menos precisas que o número informado.
 *
 * Falhas externas nunca impedem o cadastro da entrega. Nesse caso, a UI do
 * motorista continua usando o endereço textual como fallback no Waze.
 */
export async function geocodificarEnderecoEntrega(input: {
  endereco: string;
  cep: string;
}): Promise<CoordenadasEntrega | null> {
  const endereco = input.endereco.trim();
  const cep = input.cep.replace(/\D/g, "");

  if (!endereco && !cep) return null;

  const google = await geocodificarComGoogle(endereco, cep);
  if (google) return google;

  return geocodificarComBrasilApi(cep);
}
