"use client";

import { useMemo, useState } from "react";
import { PackageCheck, Search } from "lucide-react";
import { EntregaMotoristaCard } from "@/components/motorista/EntregaMotoristaCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EntregaMotorista } from "@/lib/data/entregas";

type Filtro = "todas" | "pendentes" | "em_rota" | "concluidas";

const FILTROS: Array<{ id: Filtro; label: string }> = [
  { id: "todas", label: "Todas" },
  { id: "pendentes", label: "Pendentes" },
  { id: "em_rota", label: "Em andamento" },
  { id: "concluidas", label: "Concluídas" },
];

export function MotoristaEntregasHoje({
  entregas,
}: {
  entregas: EntregaMotorista[];
}) {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");

  const contagens = useMemo(
    () => ({
      todas: entregas.length,
      pendentes: entregas.filter(
        (entrega) =>
          entrega.status === "pendente" && entrega.horaSaida === null
      ).length,
      em_rota: entregas.filter(
        (entrega) =>
          entrega.status === "pendente" && entrega.horaSaida !== null
      ).length,
      concluidas: entregas.filter(
        (entrega) => entrega.status === "entregue"
      ).length,
    }),
    [entregas]
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    return entregas.filter((entrega) => {
      const passaFiltro =
        filtro === "todas" ||
        (filtro === "concluidas" && entrega.status === "entregue") ||
        (filtro === "pendentes" &&
          entrega.status === "pendente" &&
          entrega.horaSaida === null) ||
        (filtro === "em_rota" &&
          entrega.status === "pendente" &&
          entrega.horaSaida !== null);

      if (!passaFiltro) return false;
      if (!termo) return true;

      return [
        entrega.numero,
        entrega.clienteNome,
        entrega.endereco,
        entrega.cep,
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(termo);
    });
  }, [busca, entregas, filtro]);

  return (
    <section id="entregas-hoje">
      <div className="-mx-4 overflow-x-auto px-4 pb-1">
        <div className="flex min-w-max gap-2">
          {FILTROS.map((item) => {
            const ativo = filtro === item.id;
            const quantidade = contagens[item.id];

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFiltro(item.id)}
                className={`rounded-full border px-3.5 py-2 text-xs font-black transition ${
                  ativo
                    ? "border-[#1768D8] bg-[#1768D8] text-white"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                {item.label}
                <span
                  className={`ml-1.5 ${
                    ativo ? "text-white/80" : "text-slate-400"
                  }`}
                >
                  {quantidade}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm focus-within:border-[#1768D8]">
        <Search className="size-4 shrink-0 text-slate-400" />
        <input
          type="search"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar por cliente, endereço ou código..."
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#0A1F44] outline-none placeholder:text-slate-400"
        />
      </label>

      {filtradas.length === 0 ? (
        <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            compact
            icon={PackageCheck}
            title={
              entregas.length === 0
                ? "Nenhuma entrega para hoje"
                : "Nenhuma entrega encontrada"
            }
            description={
              entregas.length === 0
                ? "Quando uma entrega for atribuída a você, ela aparecerá aqui."
                : "Tente alterar o filtro ou o termo da busca."
            }
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {filtradas.map((entrega) => (
            <EntregaMotoristaCard key={entrega.id} entrega={entrega} />
          ))}
        </div>
      )}
    </section>
  );
}
