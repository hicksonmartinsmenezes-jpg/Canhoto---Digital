"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, CalendarDays, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EntregaPorDia } from "@/lib/data/entregas";

interface EntregasPorDiaChartProps {
  dados: EntregaPorDia[];
}

const PERIODOS = [7, 15, 30, 90] as const;
type Periodo = (typeof PERIODOS)[number];

const DIAS_DA_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const PASSOS_DO_EIXO = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
const ALTURA_GRAFICO = 200;

function diaDaSemana(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return DIAS_DA_SEMANA[new Date(ano, mes - 1, dia).getDay()] ?? "";
}

/**
 * Eixo vertical com números "redondos" (0, 2, 4…) e uma folga acima da maior
 * barra, para o número em cima dela nunca encostar no topo.
 */
function montarEixo(maximo: number): { topo: number; marcas: number[] } {
  const passo =
    PASSOS_DO_EIXO.find((p) => p >= maximo / 4) ??
    Math.ceil(maximo / 4 / 1000) * 1000;
  const topo = (Math.floor(maximo / passo) + 1) * passo;
  const marcas: number[] = [];
  for (let valor = 0; valor <= topo; valor += passo) marcas.push(valor);
  return { topo, marcas };
}

export function EntregasPorDiaChart({ dados }: EntregasPorDiaChartProps) {
  const [periodo, setPeriodo] = useState<Periodo>(7);

  const dadosFiltrados = dados.slice(-periodo);
  const total = dadosFiltrados.reduce((soma, d) => soma + d.total, 0);
  const maximo = Math.max(...dadosFiltrados.map((d) => d.total), 1);
  const { topo, marcas } = montarEixo(maximo);
  // Até 15 dias cabem na largura e mostram o número em cima da barra; 30/90
  // dias rolam de lado (já abrindo nos dias mais recentes) e mostram o número
  // ao passar o mouse.
  const compacto = periodo <= 15;
  // Em 30/90 dias a data aparece de tempos em tempos (e sempre no dia mais
  // recente) para os rótulos não se sobreporem.
  const passoRotulo = periodo <= 15 ? 1 : periodo <= 30 ? 3 : 7;
  const rolagemRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rolagemRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [periodo]);

  return (
    <Card className="p-5 sm:p-7">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-[#0A1F44] sm:size-12">
            <CalendarDays className="size-5 sm:size-6" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#0A1F44] sm:text-xl">
              Entregas por dia
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {total} entrega{total === 1 ? "" : "s"} no período
            </p>
          </div>
        </div>

        <div className="relative shrink-0">
          <CalendarDays
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600"
          />
          <select
            value={periodo}
            onChange={(e) => setPeriodo(Number(e.target.value) as Periodo)}
            aria-label="Período do gráfico"
            className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors focus:border-[#0A1F44]"
          >
            {PERIODOS.map((p) => (
              <option key={p} value={p}>
                Últimos {p} dias
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-600"
          />
        </div>
      </div>

      {total === 0 ? (
        <EmptyState compact icon={BarChart3} title="Nenhuma entrega no período" />
      ) : (
        <div className="flex">
          {/* Números do eixo vertical (fixos enquanto o gráfico rola). */}
          <div
            aria-hidden
            className="relative mt-8 w-9 shrink-0 sm:w-10"
            style={{ height: ALTURA_GRAFICO }}
          >
            {marcas.map((valor) => (
              <span
                key={valor}
                className="absolute right-3 translate-y-1/2 text-[13px] tabular-nums leading-none text-slate-500"
                style={{ bottom: `${(valor / topo) * 100}%` }}
              >
                {valor}
              </span>
            ))}
          </div>

          <div ref={rolagemRef} className="min-w-0 flex-1 overflow-x-auto pt-8">
            <div
              key={periodo}
              style={compacto ? undefined : { minWidth: `${periodo * 16}px` }}
            >
              <div
                className="relative border-b border-l border-slate-300"
                style={{ height: ALTURA_GRAFICO }}
              >
                {/* Linhas de apoio tracejadas, uma por número do eixo. */}
                {marcas.slice(1).map((valor) => (
                  <div
                    key={valor}
                    aria-hidden
                    className="absolute inset-x-0 border-t border-dashed border-slate-200"
                    style={{ bottom: `${(valor / topo) * 100}%` }}
                  />
                ))}

                <div className="absolute inset-0 flex">
                  {dadosFiltrados.map((d, indice) => {
                    const alturaPct = (d.total / topo) * 100;

                    return (
                      <div
                        key={d.dataIso}
                        className="group relative flex h-full min-w-0 flex-1 items-end justify-center"
                      >
                        <div
                          aria-label={`${d.total} entrega${d.total === 1 ? "" : "s"} em ${d.dataFormatada}`}
                          className={`origin-bottom rounded-t-md transition-[filter] duration-150 motion-safe:animate-[barra-sobe_500ms_cubic-bezier(0.22,1,0.36,1)_backwards] ${
                            compacto ? "w-[78%] max-w-[104px]" : "w-[70%] max-w-6"
                          } ${
                            d.total === 0
                              ? "bg-slate-200"
                              : "bg-[#17396B] group-hover:brightness-125"
                          }`}
                          style={{
                            height:
                              d.total === 0
                                ? "2px"
                                : `max(${alturaPct}%, 3px)`,
                            animationDelay: `${Math.min(indice * 12, 300)}ms`,
                          }}
                        />

                        {compacto && (
                          <span
                            className="absolute inset-x-0 text-center text-[13px] font-bold tabular-nums text-[#0A1F44]"
                            style={{
                              bottom:
                                d.total === 0
                                  ? "8px"
                                  : `calc(max(${alturaPct}%, 3px) + 8px)`,
                            }}
                          >
                            {d.total}
                          </span>
                        )}

                        {!compacto && d.total > 0 && (
                          <div
                            className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#0A1F44] px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
                            style={{ bottom: `calc(${alturaPct}% + 8px)` }}
                          >
                            {d.total} entrega{d.total === 1 ? "" : "s"}
                            <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#0A1F44]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 flex">
                {dadosFiltrados.map((d, indice) => {
                  const mostrarRotulo =
                    (dadosFiltrados.length - 1 - indice) % passoRotulo === 0;

                  return (
                    <div
                      key={d.dataIso}
                      className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 whitespace-nowrap tabular-nums ${
                        mostrarRotulo ? "" : "invisible"
                      }`}
                    >
                      <span className="text-[11px] text-slate-600 sm:text-[13px]">
                        {d.dataFormatada}
                      </span>
                      <span className="text-[10px] text-slate-400 sm:text-xs">
                        {diaDaSemana(d.dataIso)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
