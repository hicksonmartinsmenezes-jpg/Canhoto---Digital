"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { useMotoristasEmRota } from "@/components/dashboard/useMotoristasEmRota";
import type { MotoristaEmRota } from "@/lib/data/entregas";

export function MotoristasStatCard({
  emRotaIniciais,
}: {
  emRotaIniciais: MotoristaEmRota[];
}) {
  const emRota = useMotoristasEmRota(emRotaIniciais);

  return (
    <StatCard
      label="Motoristas em rota"
      value={emRota.length.toLocaleString("pt-BR")}
    />
  );
}
