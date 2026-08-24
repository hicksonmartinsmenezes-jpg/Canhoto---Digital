"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EntregaPorDia } from "@/lib/data/entregas";

interface EntregasPorDiaChartProps {
  dados: EntregaPorDia[];
}

const PERIODOS = [7, 15, 30, 90] as const;
type Periodo = (typeof PERIODOS)[number];

// Gráfico de barras simples (Issue #25), sem biblioteca externa — Recharts
// foi cogitado em `claude/recomendacoes-stack.md`, mas pra um único gráfico
// isso seria overengineering (ver princípio em AGENTS.md). O seletor de
// período (Issue #42) filtra no cliente a série de 90 dias já buscada no
// servidor (`getEntregasPorDia(90)` em page.tsx) — evita ida ao Supabase a
// cada troca de seleção, já que os dias sem entrega vêm zerados e fatiar o
// agregado em memória é barato.
export function EntregasPorDiaChart({ dados }: EntregasPorDiaChartProps) {
  const [periodo, setPeriodo] = useState<Periodo>(30);

  const dadosFiltrados = dados.slice(-periodo);
  const total = dadosFiltrados.reduce((soma, d) => soma + d.total, 0);
  const maximo = Math.max(...dadosFiltrados.map((d) => d.total), 1);

  return (
    <Card className="p-7">
      <div className="mb-[22px] flex items-center justify-between">
        <h2 className="text-[17px] font-bold">Entregas por dia</h2>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(Number(e.target.value) as Periodo)}
          aria-label="Período do gráfico"
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 outline-none transition-colors focus:border-slate-400"
        >
          {PERIODOS.map((p) => (
            <option key={p} value={p}>
              Últimos {p} dias
            </option>
          ))}
        </select>
      </div>

      {total === 0 ? (
        <EmptyState compact icon={BarChart3} title="Nenhuma entrega no período" />
      ) : (
        <div className="overflow-x-auto">
          <div
            className="flex h-[160px] items-end gap-1.5 sm:gap-2"
            style={{ minWidth: `${Math.max(periodo * 6, 320)}px` }}
          >
            {dadosFiltrados.map((d) => {
              const alturaPct =
                d.total === 0 ? 2 : Math.max((d.total / maximo) * 100, 6);
              return (
                <div
                  key={d.dataIso}
                  className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                  title={`${d.total} entrega${d.total === 1 ? "" : "s"} em ${d.dataFormatada}`}
                >
                  <div className="flex h-full w-full items-end">
                    <div
                      className={`w-full rounded-t-md transition-colors ${
                        d.total > 0
                          ? "bg-blue-500/70 group-hover:bg-blue-500"
                          : "bg-slate-100"
                      }`}
                      style={{ height: `${alturaPct}%` }}
                    />
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
