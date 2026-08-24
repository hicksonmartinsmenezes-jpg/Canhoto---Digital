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
//
// Cor das barras (Issue #46): o mesmo azul-marinho da Sidebar (`#0A1F44`,
// ver `Sidebar.tsx`), não o azul genérico do Tailwind — reforça a
// identidade visual em vez de usar uma cor "de vitrine". O tooltip nativo
// do navegador (`title`) foi trocado por um tooltip próprio (pílula escura
// com seta) que aparece no hover, ficando mais consistente com o resto da
// interface do que o balão padrão do sistema operacional.
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
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 outline-none transition-colors focus:border-[#0A1F44]"
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
        <div className="overflow-x-auto pt-8">
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
