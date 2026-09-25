"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { useMotoristasEmRota } from "@/components/dashboard/useMotoristasEmRota";
import type { MotoristaEmRota } from "@/lib/data/entregas";

export function MotoristasStatCard({
  ativos,
  emRotaIniciais,
}: {
  ativos: number;
  emRotaIniciais: MotoristaEmRota[];
}) {
  const emRota = useMotoristasEmRota(emRotaIniciais);

  return (
    <StatCard
      label="Motoristas ativos"
      value={ativos.toLocaleString("pt-BR")}
      sub=""
      mini={{ label: "Em rota", value: emRota.length.toLocaleString("pt-BR") }}
      variant="accent"
    />
  );
}
