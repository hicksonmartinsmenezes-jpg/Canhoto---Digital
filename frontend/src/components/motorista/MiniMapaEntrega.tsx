"use client";

import { useEffect, useRef, useState } from "react";

type LngLat = [number, number];

interface MapLibreMap {
  remove(): void;
  resize(): void;
  jumpTo(options: {
    center: LngLat;
    zoom: number;
  }): void;
  fitBounds(
    bounds: [LngLat, LngLat],
    options: {
      padding: number;
      maxZoom: number;
      duration: number;
    }
  ): void;
}

interface MapLibreMarker {
  setLngLat(coordenada: LngLat): MapLibreMarker;
  addTo(map: MapLibreMap): MapLibreMarker;
  remove(): void;
}

interface MapLibreNamespace {
  Map: new (options: {
    container: HTMLElement;
    style: string;
    center: LngLat;
    zoom: number;
    interactive: boolean;
    attributionControl: boolean;
    renderWorldCopies: boolean;
  }) => MapLibreMap;
  Marker: new (options: {
    element: HTMLElement;
    anchor: "center";
  }) => MapLibreMarker;
}

declare global {
  interface Window {
    maplibregl?: MapLibreNamespace;
  }
}

const MAPLIBRE_VERSION = "5.24.0";
const MAPLIBRE_SCRIPT_ID = "canhoto-maplibre-js";
const MAPLIBRE_STYLE_ID = "canhoto-maplibre-css";
const MAPLIBRE_SCRIPT_URL =
  `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
const MAPLIBRE_CSS_URL =
  `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;

let carregamentoMapLibre: Promise<MapLibreNamespace> | null = null;

function carregarMapLibre(): Promise<MapLibreNamespace> {
  if (window.maplibregl) {
    return Promise.resolve(window.maplibregl);
  }

  if (carregamentoMapLibre) return carregamentoMapLibre;

  carregamentoMapLibre = new Promise((resolve, reject) => {
    if (!document.getElementById(MAPLIBRE_STYLE_ID)) {
      const link = document.createElement("link");
      link.id = MAPLIBRE_STYLE_ID;
      link.rel = "stylesheet";
      link.href = MAPLIBRE_CSS_URL;
      document.head.appendChild(link);
    }

    const resolver = () => {
      if (window.maplibregl) {
        resolve(window.maplibregl);
        return;
      }

      reject(new Error("MapLibre não ficou disponível."));
    };

    const existente = document.getElementById(
      MAPLIBRE_SCRIPT_ID
    ) as HTMLScriptElement | null;

    if (existente) {
      existente.addEventListener("load", resolver, { once: true });
      existente.addEventListener(
        "error",
        () => reject(new Error("Falha ao carregar MapLibre.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = MAPLIBRE_SCRIPT_ID;
    script.src = MAPLIBRE_SCRIPT_URL;
    script.async = true;
    script.onload = resolver;
    script.onerror = () =>
      reject(new Error("Falha ao carregar MapLibre."));
    document.head.appendChild(script);
  });

  return carregamentoMapLibre;
}

function criarMarcador(tipo: "destino" | "motorista"): HTMLElement {
  const elemento = document.createElement("div");
  const nucleo = document.createElement("span");

  elemento.className =
    "grid size-8 place-items-center rounded-full border-[3px] border-white shadow-[0_4px_14px_rgba(15,23,42,0.28)]";

  nucleo.className = "block size-2.5 rounded-full bg-white";

  if (tipo === "destino") {
    elemento.classList.add("bg-[#0A2C5A]");
    elemento.setAttribute("aria-label", "Destino da entrega");
  } else {
    elemento.classList.add("bg-[#1768D8]");
    elemento.setAttribute("aria-label", "Sua localização");
  }

  elemento.appendChild(nucleo);
  return elemento;
}

export function MiniMapaEntrega({
  latitude,
  longitude,
  mostrarMotorista,
}: {
  latitude: number;
  longitude: number;
  mostrarMotorista: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const marcadorMotoristaRef = useRef<MapLibreMarker | null>(null);
  const [motorista, setMotorista] = useState<LngLat | null>(null);
  const [erroMapa, setErroMapa] = useState(false);

  const destino: LngLat = [longitude, latitude];

  useEffect(() => {
    if (!mostrarMotorista || !("geolocation" in navigator)) {
      setMotorista(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        setMotorista([
          posicao.coords.longitude,
          posicao.coords.latitude,
        ]);
      },
      () => setMotorista(null),
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 10_000,
      }
    );
  }, [mostrarMotorista]);

  useEffect(() => {
    let cancelado = false;
    let marcadorDestino: MapLibreMarker | null = null;

    async function montarMapa() {
      try {
        const maplibre = await carregarMapLibre();
        if (cancelado || !containerRef.current) return;

        const style =
          process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim() ||
          "https://tiles.openfreemap.org/styles/positron";

        const map = new maplibre.Map({
          container: containerRef.current,
          style,
          center: destino,
          zoom: 16,
          interactive: false,
          attributionControl: true,
          renderWorldCopies: false,
        });

        mapRef.current = map;

        marcadorDestino = new maplibre.Marker({
          element: criarMarcador("destino"),
          anchor: "center",
        })
          .setLngLat(destino)
          .addTo(map);

        requestAnimationFrame(() => map.resize());
      } catch {
        if (!cancelado) setErroMapa(true);
      }
    }

    void montarMapa();

    return () => {
      cancelado = true;
      marcadorDestino?.remove();
      marcadorMotoristaRef.current?.remove();
      marcadorMotoristaRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibre = window.maplibregl;

    marcadorMotoristaRef.current?.remove();
    marcadorMotoristaRef.current = null;

    if (!map) return;

    if (!motorista || !maplibre) {
      map.jumpTo({
        center: destino,
        zoom: 16,
      });
      return;
    }

    marcadorMotoristaRef.current = new maplibre.Marker({
      element: criarMarcador("motorista"),
      anchor: "center",
    })
      .setLngLat(motorista)
      .addTo(map);

    map.fitBounds([destino, motorista], {
      padding: 44,
      maxZoom: 16,
      duration: 500,
    });
  }, [latitude, longitude, motorista]);

  if (erroMapa) {
    return (
      <div className="grid h-48 place-items-center rounded-[24px] bg-slate-100 px-6 text-center">
        <p className="text-xs font-bold text-slate-500">
          Não foi possível carregar o mapa agora.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-48 w-full overflow-hidden rounded-[24px] bg-[#EEF2F6]">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur">
        <span className="size-2 rounded-full bg-[#0A2C5A]" />
        <span className="text-[11px] font-black text-[#0A1F44]">
          Destino
        </span>
      </div>

      {motorista && (
        <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur">
          <span className="size-2 rounded-full bg-[#1768D8]" />
          <span className="text-[11px] font-black text-[#0A1F44]">
            Você
          </span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-10 bg-gradient-to-t from-white/20 to-transparent" />
    </div>
  );
}
