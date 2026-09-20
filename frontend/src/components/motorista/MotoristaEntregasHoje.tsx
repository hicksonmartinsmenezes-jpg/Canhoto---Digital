"use client";

import { useMemo, useState } from "react";
import { ChevronDown, PackageCheck } from "lucide-react";
import { EntregaMotoristaCard } from "@/components/motorista/EntregaMotoristaCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EntregaMotorista } from "@/lib/data/entregas";

type Filtro = "todas" | "pendentes" | "concluidas";

export function MotoristaEntregasHoje({
  entregas,
}: {
  entregas: EntregaMotorista[];
}) {
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const filtradas = useMemo(() => {
    if (filtro === "concluidas") {
      return entregas.filter((entrega) => entrega.status === "entregue");
    }

    if (filtro === "pendentes") {
      return entregas.filter((entrega) => entrega.status !== "entregue");
    }

    return entregas;
  }, [entregas, filtro]);

  return (
    <section id="entregas-hoje" className="mt-4">
      <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
        <h2 className="text-[19px] font-extrabold tracking-tight text-[#0A1F44]">
          Entregas de hoje
        </h2>

        <div className="relative shrink-0">
          <select
            aria-label="Filtrar entregas"
            value={filtro}
            onChange={(event) => setFiltro(event.target.value as Filtro)}
            className="appearance-none rounded-full border border-slate-200 bg-white py-1.5 pl-3.5 pr-8 text-[13px] font-bold text-slate-600 shadow-sm outline-none transition focus:border-[#0A1F44]"
          >
            <option value="todas">Todas</option>
            <option value="pendentes">Pendentes</option>
            <option value="concluidas">Concluídas</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            compact
            icon={PackageCheck}
            title={
              entregas.length === 0
                ? "Nenhuma entrega para hoje"
                : "Nenhuma entrega neste filtro"
            }
            description={
              entregas.length === 0
                ? "Quando uma entrega for atribuída a você, ela aparecerá nesta lista."
                : "Altere o filtro para visualizar as outras entregas."
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtradas.map((entrega) => (
            <EntregaMotoristaCard key={entrega.id} entrega={entrega} />
          ))}
        </div>
      )}
    </section>
  );
}
