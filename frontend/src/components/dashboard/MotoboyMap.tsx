"use client";

import { useEffect, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { MotoristaEmRota } from "@/lib/data/entregas";

const motoboyIcon = L.divIcon({
  className: "",
  html: `
    <div class="relative flex size-4">
      <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75"></span>
      <span class="relative inline-flex size-4 rounded-full border-2 border-white bg-amber-500 shadow"></span>
    </div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const CENTRO_PADRAO: [number, number] = [-10.9472, -37.0731];

function AjustarMapa({
  pontos,
}: {
  pontos: Array<[number, number]>;
}) {
  const map = useMap();

  useEffect(() => {
    if (pontos.length === 0) {
      map.setView(CENTRO_PADRAO, 12);
      return;
    }

    if (pontos.length === 1) {
      map.setView(pontos[0], 14);
      return;
    }

    map.fitBounds(pontos, { padding: [28, 28] });
  }, [map, pontos]);

  return null;
}

function formatarAtualizacao(valor: string | null): string {
  if (!valor) return "sem localização";

  return new Date(valor).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MotoboyMap({
  motoristas,
}: {
  motoristas: MotoristaEmRota[];
}) {
  const comLocalizacao = motoristas.filter(
    (motorista) =>
      motorista.latitude !== null && motorista.longitude !== null
  );

  const pontos = useMemo(
    () =>
      comLocalizacao.map(
        (motorista) =>
          [motorista.latitude!, motorista.longitude!] as [number, number]
      ),
    [comLocalizacao]
  );

  return (
    <MapContainer
      center={CENTRO_PADRAO}
      zoom={12}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <AjustarMapa pontos={pontos} />

      {comLocalizacao.map((motorista) => (
        <Marker
          key={motorista.motoboyId}
          position={[motorista.latitude!, motorista.longitude!]}
          icon={motoboyIcon}
        >
          <Popup>
            <strong>{motorista.nome}</strong>
            <br />
            {motorista.entregas.map((entrega) => (
              <span key={entrega.numero}>
                {entrega.numero} · {entrega.cliente}
                <br />
              </span>
            ))}
            <span style={{ color: "#64748b" }}>
              Última localização: {formatarAtualizacao(motorista.localizacaoAtualizadaEm)}
              {motorista.precisaoMetros !== null
                ? ` · precisão aproximada ±${Math.round(motorista.precisaoMetros)} m`
                : ""}
            </span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
