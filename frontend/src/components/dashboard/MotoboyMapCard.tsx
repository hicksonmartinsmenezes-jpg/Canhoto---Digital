"use client";

import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";

// O mapa em si (Leaflet) só roda no cliente — carregado sob demanda com
// ssr:false pra não quebrar a renderização no servidor.
const MotoboyMap = dynamic(
  () => import("./MotoboyMap").then((mod) => mod.MotoboyMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-500">
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
      {/* Padding do cabeçalho igualado ao card "Entregas recentes" ao lado
          (px-6 py-5) — antes usava px-7, o que desalinhava as bordas dos
          dois cards nessa linha do grid. Altura do mapa reduzida (320px →
          260px) pra não sobrar tanto espaço vazio nessa linha, o que
          empurrava "Alertas e pendências" pra baixo sem necessidade. */}
      <div className="flex items-center justify-between px-6 py-5">
        <h2 className="text-[17px] font-bold">Motoristas em tempo real</h2>
        {/* A contagem "N em rota" subiu pro mini-badge do card "Motoristas
            ativos" lá em cima (pedido do Hickson, 21/08/2026) — repetir o
            número aqui só duplicava informação. Sobra o indicador de que o
            mapa está ao vivo (mesmo padrão de pulso do badge de alertas em
            AlertsPanel.tsx, só que em verde). */}
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
          <span className="relative size-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-600/60" />
            <span className="absolute inset-0 rounded-full bg-emerald-600" />
          </span>
          Ao vivo
        </span>
      </div>
      <div className="h-[260px] w-full border-t border-slate-200">
        <MotoboyMap />
      </div>
      <div className="border-t border-slate-200 px-6 py-3 text-[11px] text-slate-500">
        Posições ilustrativas — dado real depende do futuro app do motorista.
      </div>
    </Card>
  );
}
