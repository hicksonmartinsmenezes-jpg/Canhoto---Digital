"use client";

import dynamic from "next/dynamic";

const EntregaLocalizacaoMap = dynamic(
  () =>
    import("@/components/canhotos/EntregaLocalizacaoMap").then(
      (mod) => mod.EntregaLocalizacaoMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-72 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400">
        Carregando mapa...
      </div>
    ),
  }
);

export function EntregaLocalizacaoPicker({
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
  return (
    <EntregaLocalizacaoMap
      cep={cep}
      latitude={latitude}
      longitude={longitude}
      onChange={onChange}
    />
  );
}
