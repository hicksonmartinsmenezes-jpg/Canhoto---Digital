"use client";

import { useMemo, useState } from "react";
import { PackageCheck, Route, Search } from "lucide-react";
import { EntregaMotoristaCard } from "@/components/motorista/EntregaMotoristaCard";
import { MotoristaMontarRota } from "@/components/motorista/MotoristaMontarRota";
import { MotoristaRotaEmAndamento } from "@/components/motorista/MotoristaRotaEmAndamento";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EntregaMotoristaHoje } from "@/lib/data/entregas";
import { MIN_PARADAS_ROTA } from "@/lib/rota-limites";

export function MotoristaEntregasHoje({
  entregas,
}: {
  entregas: EntregaMotoristaHoje[];
}) {
  const [busca, setBusca] = useState("");
  const [montandoRota, setMontandoRota] = useState(false);

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

  // Rotas com várias paradas ainda em andamento (cada uma vira um cartão com
  // as paradas, inclusive as já concluídas). As entregas que estão numa rota
  // não aparecem de novo como cartões soltos.
  const rotas = useMemo(() => {
    const porRota = new Map<string, EntregaMotoristaHoje[]>();
    for (const entrega of entregas) {
      if (!entrega.rotaId) continue;
      porRota.set(entrega.rotaId, [
        ...(porRota.get(entrega.rotaId) ?? []),
        entrega,
      ]);
    }
    return Array.from(porRota.entries()).filter(
      ([, paradas]) =>
        paradas.length >= 2 &&
        paradas.some(
          (parada) => parada.status === "pendente" && parada.horaSaida !== null
        )
    );
  }, [entregas]);

  const idsEmRotas = useMemo(
    () => new Set(rotas.flatMap(([, paradas]) => paradas.map((p) => p.id))),
    [rotas]
  );

  const emRotaSoltas = useMemo(
    () => emRota.filter((entrega) => !idsEmRotas.has(entrega.id)),
    [emRota, idsEmRotas]
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

  if (montandoRota) {
    return (
      <section id="entregas-hoje">
        <MotoristaMontarRota
          entregas={pendentes}
          onFechar={() => setMontandoRota(false)}
        />
      </section>
    );
  }

  return (
    <section id="entregas-hoje">
      {emRota.length > 0 && (
        <div className="mb-4">
          <h3 className="px-4 pb-2 text-xs font-black uppercase tracking-[0.08em] text-black">
            Em rota ({emRota.length})
          </h3>
          <div className="space-y-3">
            {rotas.map(([rotaId, paradas]) => (
              <MotoristaRotaEmAndamento key={rotaId} paradas={paradas} />
            ))}
            {emRotaSoltas.length > 0 && (
              <div className="border-y border-slate-200 bg-white">
                {emRotaSoltas.map((entrega) => (
                  <EntregaMotoristaCard key={entrega.id} entrega={entrega} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {emRota.length > 0 && pendentes.length > 0 && (
        <h3 className="px-4 pb-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
          Aguardando saída ({pendentes.length})
        </h3>
      )}

      {pendentes.length >= MIN_PARADAS_ROTA && (
        <div className="mx-4 mb-3">
          <button
            type="button"
            onClick={() => setMontandoRota(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#1768D8] bg-white px-4 py-3 text-sm font-black text-[#1768D8] transition hover:bg-[#F5F9FF] active:scale-[0.99]"
          >
            <Route className="size-4" />
            Montar rota com várias entregas
          </button>
        </div>
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
