"use client";

import { useEffect, useMemo, useRef } from "react";
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

const CENTRO_PADRAO: [number, number] = [-10.9472, -37.0731];

function iniciaisDoNome(nome: string): string {
  const partes = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .split(/\s+/)
    .map((parte) => parte.replace(/[^A-Z0-9]/g, ""))
    .filter(Boolean);

  if (partes.length === 0) return "M";
  if (partes.length === 1) return partes[0].slice(0, 2);
  return `${partes[0][0]}${partes.at(-1)?.[0] ?? ""}`;
}

function criarIcone(nome: string, selecionado: boolean) {
  const fundo = selecionado ? "#0A1F44" : "#F59E0B";
  const tamanho = selecionado ? 42 : 36;
  const borda = selecionado ? "3px solid #FFD200" : "3px solid #ffffff";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:${tamanho}px;
        height:${tamanho}px;
        border-radius:9999px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:${fundo};
        border:${borda};
        color:#ffffff;
        font-size:11px;
        line-height:1;
        font-weight:800;
        letter-spacing:.02em;
        box-shadow:0 4px 12px rgba(15,23,42,.25);
      ">
        ${iniciaisDoNome(nome)}
      </div>
    `,
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho / 2],
    popupAnchor: [0, -(tamanho / 2 + 4)],
  });
}

function formatarAtualizacao(valor: string | null): string {
  if (!valor) return "Sem localização";

  return new Date(valor).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AjustarMapa({
  pontos,
  motoristaSelecionadoId,
}: {
  pontos: Array<[number, number]>;
  motoristaSelecionadoId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (motoristaSelecionadoId) return;

    if (pontos.length === 0) {
      map.setView(CENTRO_PADRAO, 12);
      return;
    }

    if (pontos.length === 1) {
      map.setView(pontos[0], 14);
      return;
    }

    map.fitBounds(pontos, { padding: [48, 48] });
  }, [map, pontos, motoristaSelecionadoId]);

  return null;
}

function MotoristaMarker({
  motorista,
  selecionado,
  onSelect,
}: {
  motorista: MotoristaEmRota;
  selecionado: boolean;
  onSelect: (id: string) => void;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  const icon = useMemo(
    () => criarIcone(motorista.nome, selecionado),
    [motorista.nome, selecionado]
  );

  useEffect(() => {
    if (
      !selecionado ||
      motorista.latitude === null ||
      motorista.longitude === null
    ) {
      return;
    }

    const destino: [number, number] = [
      motorista.latitude,
      motorista.longitude,
    ];

    map.flyTo(destino, Math.max(map.getZoom(), 15), {
      animate: true,
      duration: 0.6,
    });

    window.setTimeout(() => {
      markerRef.current?.openPopup();
    }, 350);
  }, [
    map,
    motorista.latitude,
    motorista.longitude,
    selecionado,
  ]);

  if (motorista.latitude === null || motorista.longitude === null) {
    return null;
  }

  return (
    <Marker
      ref={markerRef}
      position={[motorista.latitude, motorista.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => onSelect(motorista.motoboyId),
      }}
    >
      <Popup minWidth={240}>
        <div style={{ minWidth: 220 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#0A1F44",
              marginBottom: 4,
            }}
          >
            {motorista.nome}
          </div>

          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              marginBottom: 10,
            }}
          >
            {motorista.entregas.length} entrega
            {motorista.entregas.length === 1 ? "" : "s"} em rota
          </div>

          <div style={{ display: "grid", gap: 7 }}>
            {motorista.entregas.map((entrega) => (
              <div
                key={entrega.numero}
                style={{
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: 7,
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 700, color: "#0f172a" }}>
                  {entrega.numero} · {entrega.cliente}
                </div>
                {(entrega.endereco || entrega.cep) && (
                  <div style={{ color: "#64748b", marginTop: 2 }}>
                    {[entrega.endereco, entrega.cep && `CEP ${entrega.cep}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px solid #e2e8f0",
              fontSize: 11,
              color: "#64748b",
            }}
          >
            Última posição: {formatarAtualizacao(motorista.localizacaoAtualizadaEm)}
            {motorista.precisaoMetros !== null
              ? ` · ±${Math.round(motorista.precisaoMetros)} m`
              : ""}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

export function MotoboyMap({
  motoristas,
  motoristaSelecionadoId,
  onSelecionarMotorista,
}: {
  motoristas: MotoristaEmRota[];
  motoristaSelecionadoId: string | null;
  onSelecionarMotorista: (id: string) => void;
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
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <AjustarMapa
        pontos={pontos}
        motoristaSelecionadoId={motoristaSelecionadoId}
      />

      {comLocalizacao.map((motorista) => (
        <MotoristaMarker
          key={motorista.motoboyId}
          motorista={motorista}
          selecionado={motorista.motoboyId === motoristaSelecionadoId}
          onSelect={onSelecionarMotorista}
        />
      ))}
    </MapContainer>
  );
}
