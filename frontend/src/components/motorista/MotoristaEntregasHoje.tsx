"use client";

import { useMemo, useState } from "react";
import { PackageCheck, Search } from "lucide-react";
import { EntregaMotoristaCard } from "@/components/motorista/EntregaMotoristaCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EntregaMotorista } from "@/lib/data/entregas";

export function MotoristaEntregasHoje({
  entregas,
}: {
  entregas: EntregaMotorista[];
}) {
  const [busca, setBusca] = useState("");

  // Todas as entregas já iniciadas (o servidor permite mais de uma em rota;
  // antes só a primeira aparecia, no topo, e as outras sumiam da lista).
  const emRota = useMemo(
    () =>
      entregas.filter(
        (entrega) =>
          entrega.status === "pendente" && entrega.horaSaida !== null
      ),
    [entregas]
  );

  const pendentes = useMemo(
    () =>
      entregas.filter(
        (entrega) =>
          entrega.status === "pendente" && entrega.horaSaida === null
      ),
    [entregas]
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return pendentes;

    return pendentes.filter((entrega) =>
      [
        entrega.numero,
        entrega.clienteNome,
        entrega.endereco,
        entrega.cep,
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(termo)
    );
  }, [busca, pendentes]);

  return (
    <section id="entregas-hoje">
      {emRota.length > 0 && (
        <div className="mb-4">
          <h3 className="px-4 pb-2 text-xs font-black uppercase tracking-[0.08em] text-[#1768D8]">
            Em rota ({emRota.length})
          </h3>
          <div className="border-y border-slate-200 bg-white">
            {emRota.map((entrega) => (
              <EntregaMotoristaCard key={entrega.id} entrega={entrega} />
            ))}
          </div>
        </div>
      )}

      {emRota.length > 0 && pendentes.length > 0 && (
        <h3 className="px-4 pb-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
          Aguardando saída ({pendentes.length})
        </h3>
      )}

      {pendentes.length > 1 && (
        <label className="mx-4 flex items-center gap-2 border-b border-slate-300 bg-transparent py-2.5 focus-within:border-[#1768D8]">
          <Search className="size-4 shrink-0 text-slate-400" />
          <input
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar entrega pendente..."
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#0A1F44] outline-none placeholder:text-slate-400"
          />
        </label>
      )}

      {emRota.length > 0 && pendentes.length === 0 ? null : filtradas.length === 0 ? (
        <div className="border-y border-slate-200 bg-white">
          <EmptyState
            compact
            icon={PackageCheck}
            title={
              pendentes.length === 0
                ? "Nenhuma entrega pendente"
                : "Nenhuma entrega encontrada"
            }
            description={
              pendentes.length === 0
                ? "As próximas entregas atribuídas a você aparecerão aqui."
                : "Tente buscar por outro cliente, endereço ou código."
            }
          />
        </div>
      ) : (
        <div className="border-y border-slate-200 bg-white">
          {filtradas.map((entrega) => (
            <EntregaMotoristaCard key={entrega.id} entrega={entrega} />
          ))}
        </div>
      )}
    </section>
  );
}
