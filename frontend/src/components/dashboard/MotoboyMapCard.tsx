"use client";

import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";
import { MOTOBOYS_LOCALIZACAO } from "@/lib/motoboys-localizacao-mock";

// O mapa em si (Leaflet) só roda no cliente — carregado sob demanda com
// ssr:false pra não quebrar a renderização no servidor.
const MotoboyMap = dynamic(
  () => import("./MotoboyMap").then((mod) => mod.MotoboyMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
        Carregando mapa…
      </div>
    ),
  },
);

// Card "Entregas por status" evoluído: no lugar do gráfico de rosca, um
// mapa com a posição de cada motoboy em rota. Posições hoje são ilustrativas
// (ver claude/ideias-decisoes-projeto.md) — só viram dado real quando o
// motoboy tiver um app próprio enviando localização.
export function MotoboyMapCard() {
  return (
    <Card className="flex flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between px-7 py-5">
        <h2 className="text-[17px] font-bold">Motoristas em tempo real</h2>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
          <span className="size-1.5 rounded-full bg-emerald-600" />
          {MOTOBOYS_LOCALIZACAO.length} em rota
        </span>
      </div>
      <div className="h-[320px] w-full border-t border-slate-200">
        <MotoboyMap />
      </div>
      <div className="border-t border-slate-200 px-7 py-2.5 text-[11px] text-slate-400">
        Posições ilustrativas — dado real depende do futuro app do motorista.
      </div>
    </Card>
  );
}
