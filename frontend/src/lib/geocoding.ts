import "server-only";

export interface CoordenadasEntrega {
  latitude: string;
  longitude: string;
  fonte: "google";
}

interface GoogleGeocodeResponse {
  status?: string;
  results?: Array<{
    partial_match?: boolean;
    geometry?: {
      location_type?:
        | "ROOFTOP"
        | "RANGE_INTERPOLATED"
        | "GEOMETRIC_CENTER"
        | "APPROXIMATE";
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
  longitude: number
): CoordenadasEntrega {
  return {
    latitude: latitude.toFixed(6),
    longitude: longitude.toFixed(6),
    fonte: "google",
  };
}

/**
 * Geocodifica o endereço completo somente no servidor.
 *
 * Para não mandar o motorista para um ponto aproximado incorreto, só são
 * persistidos resultados completos do Brasil com precisão ROOFTOP ou
 * RANGE_INTERPOLATED. Resultados aproximados continuam usando o endereço
 * textual no Waze.
 *
 * A ausência da chave ou uma falha do provedor nunca bloqueia o cadastro.
 */
export async function geocodificarEnderecoEntrega(input: {
  endereco: string;
  cep: string;
}): Promise<CoordenadasEntrega | null> {
  const apiKey = process.env.GOOGLE_MAPS_GEOCODING_API_KEY?.trim();
  const endereco = input.endereco.trim();
  const cep = input.cep.replace(/\D/g, "");

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
    if (!resultado || resultado.partial_match) return null;

    const pais = resultado.address_components
      ?.find((componente) => componente.types?.includes("country"))
      ?.short_name?.toUpperCase();

    if (pais && pais !== "BR") return null;

    const tipoPrecisao = resultado.geometry?.location_type;
    if (
      tipoPrecisao !== "ROOFTOP" &&
      tipoPrecisao !== "RANGE_INTERPOLATED"
    ) {
      return null;
    }

    const latitude = Number(resultado.geometry?.location?.lat);
    const longitude = Number(resultado.geometry?.location?.lng);

    if (!coordenadaValida(latitude, longitude)) return null;

    return formatarCoordenadas(latitude, longitude);
  } catch {
    return null;
  }
}
