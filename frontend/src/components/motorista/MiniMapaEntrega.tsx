"use client";

import { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";

type Coordenada = [number, number];

function AjustarEnquadramento({
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
        padding: [28, 28],
        maxZoom: 16,
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
  const destino: Coordenada = [latitude, longitude];
  const [motorista, setMotorista] = useState<Coordenada | null>(null);

  useEffect(() => {
    if (!mostrarMotorista || !("geolocation" in navigator)) {
      setMotorista(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
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
        timeout: 10_000,
      }
    );
  }, [mostrarMotorista]);

  const tileUrl =
    process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim() ||
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div
      className="relative h-44 w-full overflow-hidden rounded-2xl bg-slate-100"
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
          radius={9}
          pathOptions={{
            color: "#ffffff",
            weight: 3,
            fillColor: "#E5484D",
            fillOpacity: 1,
          }}
        />

        {motorista && (
          <CircleMarker
            center={motorista}
            radius={7}
            pathOptions={{
              color: "#ffffff",
              weight: 3,
              fillColor: "#1768D8",
              fillOpacity: 1,
            }}
          />
        )}

        <AjustarEnquadramento
          destino={destino}
          motorista={motorista}
        />
      </MapContainer>

      <div className="pointer-events-none absolute left-2.5 top-2.5 z-[500] rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black text-[#0A1F44] shadow-sm">
        Destino
      </div>
    </div>
  );
}
