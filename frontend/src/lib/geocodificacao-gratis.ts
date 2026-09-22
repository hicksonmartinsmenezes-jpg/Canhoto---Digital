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
  };
}

interface PhotonResponse {
  features?: PhotonFeature[];
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

function aceitarResultado(
  feature: PhotonFeature,
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
  params: URLSearchParams,
  numeroInformado: string,
  cep: string
): Promise<CoordenadasEntrega | null> {
  try {
    const resposta = await fetch(
      `https://photon.komoot.io/structured?${params.toString()}`,
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
      const coordenadas = aceitarResultado(
        feature,
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

/**
 * Geocodificação automática e sem chave paga.
 *
 * Usa BrasilAPI para decompor o CEP e Photon/OSM para localizar o endereço.
 * Só aceita coordenadas quando país, número e CEP (quando presentes no
 * resultado) são compatíveis com o que o operador digitou.
 *
 * Se não houver resultado confiável, retorna null e o motorista continua
 * com o fallback textual do Waze — nunca salvamos uma coordenada duvidosa.
 */
export async function geocodificarEntregaGratis(input: {
  endereco: string;
  cep: string;
}): Promise<CoordenadasEntrega | null> {
  const endereco = input.endereco.trim();
  const cep = somenteDigitos(input.cep);

  if (!endereco) return null;

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

  return buscarPhoton(params, numero, cep);
}
