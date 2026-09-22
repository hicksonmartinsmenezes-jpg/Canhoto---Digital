"use client";

import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EntregaPorDia } from "@/lib/data/entregas";

interface EntregasPorDiaChartProps {
  dados: EntregaPorDia[];
}

// O Dashboard usa sempre os últimos 7 dias. A série já chega pronta do
// servidor, incluindo dias sem entrega com total zero.
export function EntregasPorDiaChart({ dados }: EntregasPorDiaChartProps) {
  const dadosFiltrados = dados.slice(-7);
  const total = dadosFiltrados.reduce((soma, d) => soma + d.total, 0);
  const maximo = Math.max(...dadosFiltrados.map((d) => d.total), 1);

  return (
    <Card className="p-7">
      <div className="mb-[22px] flex items-center justify-between gap-4">
        <h2 className="text-[17px] font-bold">Entregas por dia</h2>
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
          Últimos 7 dias
        </span>
      </div>

      {total === 0 ? (
        <EmptyState compact icon={BarChart3} title="Nenhuma entrega no período" />
      ) : (
        <div className="overflow-x-auto pt-8">
          <div className="flex h-[160px] min-w-[320px] items-end gap-1.5 sm:gap-2">
            {dadosFiltrados.map((d) => {
              const alturaPct =
                d.total === 0 ? 2 : Math.max((d.total / maximo) * 100, 6);

              return (
                <div
                  key={d.dataIso}
                  className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <div className="relative flex h-full w-full items-end">
                    <div
                      aria-label={`${d.total} entrega${d.total === 1 ? "" : "s"} em ${d.dataFormatada}`}
                      className={`w-full rounded-t-lg transition-all duration-150 ${
                        d.total > 0
                          ? "bg-[#0A1F44] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] group-hover:brightness-125"
                          : "bg-slate-100"
                      }`}
                      style={{ height: `${alturaPct}%` }}
                    />

                    {d.total > 0 && (
                      <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#0A1F44] px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                        {d.total} entrega{d.total === 1 ? "" : "s"}
                        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#0A1F44]" />
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] font-semibold tabular-nums text-slate-400">
                    {d.dataFormatada}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
