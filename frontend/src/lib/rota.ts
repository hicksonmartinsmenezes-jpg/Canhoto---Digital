// Funções puras da rota com várias paradas: ordem sugerida e links dos mapas.
// Sem dependência de servidor nem de navegador (roda no app e nos testes).

export interface ParadaRota {
  id: string;
  latitude: number | null;
  longitude: number | null;
  /** Endereço em texto, usado quando a entrega ainda não tem coordenadas. */
  enderecoTexto: string;
}

export interface Ponto {
  latitude: number;
  longitude: number;
}

/** Distância em km em linha reta (fórmula de haversine). */
export function distanciaKm(a: Ponto, b: Ponto): number {
  const raioTerraKm = 6371;
  const paraRad = (graus: number) => (graus * Math.PI) / 180;
  const dLat = paraRad(b.latitude - a.latitude);
  const dLng = paraRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(paraRad(a.latitude)) *
      Math.cos(paraRad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * raioTerraKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

function ponto(parada: ParadaRota): Ponto | null {
  return parada.latitude !== null && parada.longitude !== null
    ? { latitude: parada.latitude, longitude: parada.longitude }
    : null;
}

/**
 * Ordem sugerida: sempre a parada mais próxima da anterior (vizinho mais
 * próximo). Sem `origem`, começa pela primeira da lista. Paradas sem
 * coordenadas mantêm a ordem em que vieram e vão para o fim.
 */
export function ordenarPorProximidade<T extends ParadaRota>(
  paradas: T[],
  origem: Ponto | null
): T[] {
  const comCoordenadas = paradas.filter((p) => ponto(p) !== null);
  const semCoordenadas = paradas.filter((p) => ponto(p) === null);

  const restantes = [...comCoordenadas];
  const ordenadas: T[] = [];
  let atual: Ponto | null = origem;

  if (!atual && restantes.length > 0) {
    const primeira = restantes.shift()!;
    ordenadas.push(primeira);
    atual = ponto(primeira);
  }

  while (restantes.length > 0 && atual) {
    let melhor = 0;
    let menor = Infinity;
    restantes.forEach((candidata, indice) => {
      const d = distanciaKm(atual!, ponto(candidata)!);
      if (d < menor) {
        menor = d;
        melhor = indice;
      }
    });
    const [escolhida] = restantes.splice(melhor, 1);
    ordenadas.push(escolhida);
    atual = ponto(escolhida);
  }

  return [...ordenadas, ...semCoordenadas];
}

function destinoTexto(parada: ParadaRota): string {
  const p = ponto(parada);
  return p ? `${p.latitude},${p.longitude}` : parada.enderecoTexto;
}

/**
 * Link do Google Maps com a rota inteira: parte da posição atual do
 * motorista, passa pelas paradas intermediárias e termina na última.
 * Retorna null se não houver nenhuma parada com destino.
 */
export function linkGoogleMapsRota(paradas: ParadaRota[]): string | null {
  const destinos = paradas.map(destinoTexto).filter((d) => d.trim() !== "");
  if (destinos.length === 0) return null;

  const params = new URLSearchParams({
    api: "1",
    travelmode: "driving",
    destination: destinos[destinos.length - 1],
  });
  const intermediarias = destinos.slice(0, -1);
  if (intermediarias.length > 0) {
    params.set("waypoints", intermediarias.join("|"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Link do Waze para uma parada (o Waze só aceita um destino por vez). */
export function linkWazeParada(parada: ParadaRota): string | null {
  const p = ponto(parada);
  const params = new URLSearchParams({ navigate: "yes" });
  if (p) {
    params.set("ll", `${p.latitude},${p.longitude}`);
  } else if (parada.enderecoTexto.trim()) {
    params.set("q", parada.enderecoTexto);
  } else {
    return null;
  }
  return `https://waze.com/ul?${params.toString()}`;
}
