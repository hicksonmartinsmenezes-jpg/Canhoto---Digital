import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EntregaPorDia } from "@/lib/data/entregas";

interface EntregasPorDiaChartProps {
  dados: EntregaPorDia[];
}

// Gráfico de barras simples (Issue #25), sem biblioteca externa — Recharts
// foi cogitado em `claude/recomendacoes-stack.md`, mas pra um único gráfico
// isso seria overengineering (ver princípio em AGENTS.md). Server Component
// puro (divs + Tailwind), sem necessidade de interatividade em JS no
// cliente; o valor de cada dia aparece via `title` (tooltip nativo do
// navegador) e como legenda embaixo da barra.
export function EntregasPorDiaChart({ dados }: EntregasPorDiaChartProps) {
  const total = dados.reduce((soma, d) => soma + d.total, 0);
  const maximo = Math.max(...dados.map((d) => d.total), 1);

  return (
    <Card className="p-7">
      <div className="mb-[22px] flex items-center justify-between">
        <h2 className="text-[17px] font-bold">Entregas por dia</h2>
        <span className="text-xs font-semibold text-slate-500">
          Últimos {dados.length} dias
        </span>
      </div>

      {total === 0 ? (
        <EmptyState compact icon={BarChart3} title="Nenhuma entrega no período" />
      ) : (
        <div className="overflow-x-auto">
          <div className="flex h-[160px] min-w-[560px] items-end gap-1.5 sm:min-w-0 sm:gap-2">
            {dados.map((d) => {
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
                          ? "bg-amber-500/70 group-hover:bg-amber-500"
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
