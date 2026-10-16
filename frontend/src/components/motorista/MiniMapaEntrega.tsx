"use client";

import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";

type Coordenada = [number, number];

function AjustarMapa({
  destino,
  motorista,
}: {
  destino: Coordenada;
  motorista: Coordenada | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (motorista) {
      map.fitBounds([destino, motorista], {
        padding: [38, 38],
        maxZoom: 16,
        animate: false,
      });
      return;
    }

    map.setView(destino, 16, {
      animate: false,
    });
  }, [destino, map, motorista]);

  return null;
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
  const destino = useMemo<Coordenada>(
    () => [latitude, longitude],
    [latitude, longitude]
  );
  const [motorista, setMotorista] = useState<Coordenada | null>(null);

  useEffect(() => {
    if (!mostrarMotorista || !("geolocation" in navigator)) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (posicao) => {
        setMotorista([
          posicao.coords.latitude,
          posicao.coords.longitude,
        ]);
      },
      () => setMotorista(null),
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [mostrarMotorista]);

  const motoristaVisivel = mostrarMotorista ? motorista : null;

  const tileUrl =
    process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim() ||
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div
      className="canhoto-mini-map relative h-48 w-full overflow-hidden rounded-[24px] bg-[#EEF2F6]"
      aria-label="Mapa do destino da entrega"
    >
      <MapContainer
        center={destino}
        zoom={16}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        boxZoom={false}
        keyboard={false}
        dragging={false}
        touchZoom={false}
        attributionControl
        className="h-full w-full"
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <CircleMarker
          center={destino}
          radius={10}
          pathOptions={{
            color: "#ffffff",
            weight: 4,
            fillColor: "#0A2C5A",
            fillOpacity: 1,
          }}
        />

        <CircleMarker
          center={destino}
          radius={3}
          pathOptions={{
            color: "#ffffff",
            weight: 0,
            fillColor: "#ffffff",
            fillOpacity: 1,
          }}
        />

        {motoristaVisivel && (
          <>
            <CircleMarker
              center={motoristaVisivel}
              radius={9}
              pathOptions={{
                color: "#ffffff",
                weight: 4,
                fillColor: "#1768D8",
                fillOpacity: 1,
              }}
            />
            <CircleMarker
              center={motoristaVisivel}
              radius={3}
              pathOptions={{
                color: "#ffffff",
                weight: 0,
                fillColor: "#ffffff",
                fillOpacity: 1,
              }}
            />
          </>
        )}

        <AjustarMapa destino={destino} motorista={motoristaVisivel} />
      </MapContainer>

      <div className="pointer-events-none absolute inset-0 z-[400] bg-gradient-to-b from-white/5 via-transparent to-white/10" />

      <div className="pointer-events-none absolute left-3 top-3 z-[500] flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur">
        <span className="size-2 rounded-full bg-[#0A2C5A]" />
        <span className="text-[11px] font-black text-[#0A1F44]">
          Destino
        </span>
      </div>

      {motoristaVisivel && (
        <div className="pointer-events-none absolute right-3 top-3 z-[500] flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur">
          <span className="size-2 rounded-full bg-[#1768D8]" />
          <span className="text-[11px] font-black text-[#0A1F44]">
            Você
          </span>
        </div>
      )}
    </div>
  );
}
