import { describe, expect, it } from "vitest";
import {
  distanciaKm,
  linkGoogleMapsRota,
  linkWazeParada,
  ordenarPorProximidade,
  type ParadaRota,
} from "@/lib/rota";

function parada(
  id: string,
  latitude: number | null,
  longitude: number | null,
  enderecoTexto = ""
): ParadaRota {
  return { id, latitude, longitude, enderecoTexto };
}

describe("distanciaKm", () => {
  it("é zero para o mesmo ponto e cresce com a distância", () => {
    const a = { latitude: -10.9, longitude: -37.07 };
    const b = { latitude: -10.91, longitude: -37.07 };
    expect(distanciaKm(a, a)).toBe(0);
    expect(distanciaKm(a, b)).toBeGreaterThan(1);
    expect(distanciaKm(a, b)).toBeLessThan(1.2);
  });
});

describe("ordenarPorProximidade", () => {
  it("segue sempre a parada mais próxima, a partir da origem", () => {
    const longe = parada("longe", -10.95, -37.07);
    const meio = parada("meio", -10.92, -37.07);
    const perto = parada("perto", -10.91, -37.07);
    const origem = { latitude: -10.9, longitude: -37.07 };

    expect(
      ordenarPorProximidade([longe, meio, perto], origem).map((p) => p.id)
    ).toEqual(["perto", "meio", "longe"]);
  });

  it("sem origem começa pela primeira da lista", () => {
    const a = parada("a", -10.95, -37.07);
    const b = parada("b", -10.91, -37.07);
    const c = parada("c", -10.94, -37.07);

    expect(ordenarPorProximidade([a, b, c], null).map((p) => p.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it("paradas sem coordenadas vão para o fim, na ordem original", () => {
    const sem1 = parada("sem1", null, null, "Rua A");
    const com = parada("com", -10.91, -37.07);
    const sem2 = parada("sem2", null, null, "Rua B");

    expect(
      ordenarPorProximidade([sem1, com, sem2], null).map((p) => p.id)
    ).toEqual(["com", "sem1", "sem2"]);
  });
});

describe("linkGoogleMapsRota", () => {
  it("usa a última parada como destino e as outras como paradas no caminho", () => {
    const url = new URL(
      linkGoogleMapsRota([
        parada("1", -10.9, -37.07),
        parada("2", -10.91, -37.08, "Rua B"),
        parada("3", null, null, "Rua C, 49000-000"),
      ])!
    );

    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("destination")).toBe("Rua C, 49000-000");
    expect(url.searchParams.get("waypoints")).toBe("-10.9,-37.07|-10.91,-37.08");
  });

  it("com uma só parada não leva waypoints", () => {
    const url = new URL(linkGoogleMapsRota([parada("1", -10.9, -37.07)])!);
    expect(url.searchParams.get("destination")).toBe("-10.9,-37.07");
    expect(url.searchParams.has("waypoints")).toBe(false);
  });

  it("retorna null sem nenhum destino", () => {
    expect(linkGoogleMapsRota([parada("1", null, null, "")])).toBeNull();
    expect(linkGoogleMapsRota([])).toBeNull();
  });
});

describe("linkWazeParada", () => {
  it("usa coordenadas quando existem e o endereço quando não", () => {
    const comCoord = new URL(linkWazeParada(parada("1", -10.9, -37.07))!);
    expect(comCoord.searchParams.get("ll")).toBe("-10.9,-37.07");
    expect(comCoord.searchParams.get("navigate")).toBe("yes");

    const comTexto = new URL(
      linkWazeParada(parada("2", null, null, "Rua B, 100"))!
    );
    expect(comTexto.searchParams.get("q")).toBe("Rua B, 100");
  });

  it("retorna null sem destino", () => {
    expect(linkWazeParada(parada("3", null, null, " "))).toBeNull();
  });
});
