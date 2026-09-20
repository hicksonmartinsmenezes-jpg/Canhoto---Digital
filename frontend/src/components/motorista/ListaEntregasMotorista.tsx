"use client";

import { useMemo, useState } from "react";
import { PackageCheck } from "lucide-react";
import type { EntregaMotorista } from "@/lib/data/entregas";
import { EntregaMotoristaCard } from "@/components/motorista/EntregaMotoristaCard";

type Aba = "pendentes" | "concluidas";

export function ListaEntregasMotorista({
  entregas,
}: {
  entregas: EntregaMotorista[];
}) {
  const [aba, setAba] = useState<Aba>("pendentes");

  const pendentes = useMemo(
    () => entregas.filter((entrega) => entrega.status !== "entregue"),
    [entregas]
  );
  const concluidas = useMemo(
    () => entregas.filter((entrega) => entrega.status === "entregue"),
    [entregas]
  );

  const lista = aba === "pendentes" ? pendentes : concluidas;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <nav className="grid grid-cols-2 border-b border-[#1c355e] bg-[#0e1e38]">
        <button
          type="button"
          onClick={() => setAba("pendentes")}
          className={`border-b-2 px-3 py-3 text-sm font-extrabold transition ${
            aba === "pendentes"
              ? "border-amber-400 bg-amber-400/5 text-amber-400"
              : "border-transparent text-slate-400"
          }`}
        >
          A fazer
          <span className="ml-2 rounded-full bg-[#162b4d] px-2 py-0.5 text-[11px]">
            {pendentes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAba("concluidas")}
          className={`border-b-2 px-3 py-3 text-sm font-extrabold transition ${
            aba === "concluidas"
              ? "border-amber-400 bg-amber-400/5 text-amber-400"
              : "border-transparent text-slate-400"
          }`}
        >
          Concluídas
          <span className="ml-2 rounded-full bg-[#162b4d] px-2 py-0.5 text-[11px]">
            {concluidas.length}
          </span>
        </button>
      </nav>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        {lista.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full border border-[#1c355e] bg-[#0e1e38] text-amber-400">
              <PackageCheck className="size-5" />
            </div>
            <p className="mt-4 text-sm font-bold text-white">
              {aba === "pendentes"
                ? "Nenhuma entrega pendente"
                : "Nenhuma entrega concluída hoje"}
            </p>
          </div>
        ) : (
          lista.map((entrega) => (
            <EntregaMotoristaCard key={entrega.id} entrega={entrega} />
          ))
        )}
      </div>
    </section>
  );
}
