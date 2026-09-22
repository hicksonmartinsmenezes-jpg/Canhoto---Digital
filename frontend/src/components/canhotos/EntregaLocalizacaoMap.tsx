"use client";

import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { LocateFixed, MapPin, Trash2 } from "lucide-react";

const CENTRO_PADRAO: [number, number] = [-10.9472, -37.0731];

const pinIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:34px;
      height:34px;
      border-radius:9999px 9999px 9999px 4px;
      transform:rotate(-45deg);
      display:flex;
      align-items:center;
      justify-content:center;
      background:#1768D8;
      border:3px solid #ffffff;
      box-shadow:0 5px 14px rgba(15,23,42,.28);
    ">
      <div style="
        width:8px;
        height:8px;
        border-radius:9999px;
        background:#ffffff;
      "></div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

function MoverMapa({
  centro,
  zoom,
}: {
  centro: [number, number];
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(centro, zoom, {
      animate: true,
      duration: 0.5,
    });
  }, [centro, map, zoom]);

  return null;
}

function CapturarClique({
  onChange,
}: {
  onChange: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

interface BrasilApiCepV2 {
  location?: {
    coordinates?: {
      latitude?: string | number;
      longitude?: string | number;
    };
  };
}

export function EntregaLocalizacaoMap({
  cep,
  latitude,
  longitude,
  onChange,
}: {
  cep: string;
  latitude: number | null;
  longitude: number | null;
  onChange: (coordenadas: {
    latitude: number | null;
    longitude: number | null;
  }) => void;
}) {
  const [centro, setCentro] = useState<[number, number]>(
    latitude !== null && longitude !== null
      ? [latitude, longitude]
      : CENTRO_PADRAO
  );
  const [zoom, setZoom] = useState(
    latitude !== null && longitude !== null ? 17 : 12
  );
  const [localizandoCep, setLocalizandoCep] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const ponto = useMemo<[number, number] | null>(
    () =>
      latitude !== null && longitude !== null
        ? [latitude, longitude]
        : null,
    [latitude, longitude]
  );

  useEffect(() => {
    if (!ponto) return;
    setCentro(ponto);
    setZoom(18);
  }, [ponto]);

  async function centralizarPeloCep() {
    const cepLimpo = cep.replace(/\D/g, "");

    if (cepLimpo.length !== 8) {
      setMensagem("Informe um CEP válido antes de centralizar o mapa.");
      return;
    }

    setLocalizandoCep(true);
    setMensagem(null);

    try {
      const resposta = await fetch(
        `https://brasilapi.com.br/api/cep/v2/${cepLimpo}`
      );

      if (!resposta.ok) {
        setMensagem("Não foi possível localizar esse CEP.");
        return;
      }

      const dados = (await resposta.json()) as BrasilApiCepV2;
      const lat = Number(dados.location?.coordinates?.latitude);
      const lng = Number(dados.location?.coordinates?.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setMensagem(
          "O CEP foi encontrado, mas não possui coordenadas. Posicione o mapa manualmente."
        );
        return;
      }

      setCentro([lat, lng]);
      setZoom(17);
      setMensagem("Mapa centralizado pelo CEP. Agora clique no ponto exato.");
    } catch {
      setMensagem(
        "Não foi possível consultar o CEP agora. Você ainda pode marcar o ponto manualmente."
      );
    } finally {
      setLocalizandoCep(false);
    }
  }

  function selecionar(latitudeNova: number, longitudeNova: number) {
    const latitudeArredondada = Number(latitudeNova.toFixed(6));
    const longitudeArredondada = Number(longitudeNova.toFixed(6));

    onChange({
      latitude: latitudeArredondada,
      longitude: longitudeArredondada,
    });
    setCentro([latitudeArredondada, longitudeArredondada]);
    setZoom(18);
    setMensagem("Ponto exato selecionado.");
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-[#0A1F44]">
            Localização exata
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Clique no local exato da entrega. Esse ponto será enviado ao Waze.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={localizandoCep}
            onClick={centralizarPeloCep}
            className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <LocateFixed className="size-3.5" />
            {localizandoCep ? "Localizando..." : "Centralizar pelo CEP"}
          </button>

          {ponto && (
            <button
              type="button"
              onClick={() =>
                onChange({ latitude: null, longitude: null })
              }
              className="grid size-8 place-items-center text-slate-400 transition hover:text-red-600"
              aria-label="Remover ponto exato"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="h-72 w-full">
        <MapContainer
          center={centro}
          zoom={zoom}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MoverMapa centro={centro} zoom={zoom} />
          <CapturarClique onChange={selecionar} />

          {ponto && <Marker position={ponto} icon={pinIcon} />}
        </MapContainer>
      </div>

      <div className="flex items-start gap-2 border-t border-slate-200 px-4 py-3">
        <MapPin className="mt-0.5 size-4 shrink-0 text-[#1768D8]" />
        <div className="min-w-0">
          {ponto ? (
            <p className="text-xs font-semibold text-slate-700">
              Ponto confirmado: {ponto[0].toFixed(6)}, {ponto[1].toFixed(6)}
            </p>
          ) : (
            <p className="text-xs font-semibold text-slate-600">
              Nenhum ponto confirmado ainda.
            </p>
          )}
          {mensagem && (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {mensagem}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
