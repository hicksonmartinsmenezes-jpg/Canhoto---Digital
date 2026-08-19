"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { MOTOBOYS_LOCALIZACAO } from "@/lib/motoboys-localizacao-mock";

// Ícone customizado (ponto pulsante âmbar) em vez do marcador padrão do
// Leaflet — evita o problema clássico de path de imagem quebrado com
// bundlers (Next/webpack) e já fica no tom da marca.
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

// Centro do mapa: Aracaju/SE, onde fica a sede da Rildon Eletropeças.
const CENTRO_ARACAJU: [number, number] = [-10.9472, -37.0731];

export function MotoboyMap() {
  return (
    <MapContainer
      center={CENTRO_ARACAJU}
      zoom={13}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {MOTOBOYS_LOCALIZACAO.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={motoboyIcon}>
          <Popup>
            <strong>{m.motoboy}</strong>
            <br />
            Entrega {m.entregaNumero} · {m.cliente}
            <br />
            <span style={{ color: "#94a3b8" }}>
              Atualizado {m.atualizadoEm}
            </span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
