import { Bike } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentCanhotosTable } from "@/components/dashboard/RecentCanhotosTable";
import { MotoboyMapCard } from "@/components/dashboard/MotoboyMapCard";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import {
  getAlertas,
  getAtividadeRecente,
  getDashboardStats,
  getEntregasRecentes,
} from "@/lib/data/entregas";

// Renderiza a cada request — dados vêm do Supabase (ver claude/modelo-de-dados-site.md),
// não faz sentido cachear estaticamente um dashboard operacional.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, entregasRecentes, alertas, atividade] = await Promise.all([
    getDashboardStats(),
    getEntregasRecentes(5),
    getAlertas(),
    getAtividadeRecente(4),
  ]);

  const eficiencia =
    stats.totalEntregas > 0
      ? ((stats.entregues / stats.totalEntregas) * 100).toFixed(1).replace(".", ",")
      : "0,0";

  return (
    <div>
      <PageHeader title="Dashboard" beta />

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard
            label="Total de entregas"
            value={stats.totalEntregas.toLocaleString("pt-BR")}
            sub="registradas no sistema"
            variant="accent"
          />
        </div>

        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard
            label="Entregues"
            value={stats.entregues.toLocaleString("pt-BR")}
            sub={`${stats.entregues} de ${stats.totalEntregas} entregas`}
            mini={{ label: "Eficiência", value: `${eficiencia}%` }}
          />
        </div>

        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard
            label="Pendentes"
            value={stats.pendentes.toLocaleString("pt-BR")}
            sub="aguardando saída ou confirmação"
          />
        </div>

        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard
            label="Motoristas ativos"
            value={stats.motoristasAtivos.toLocaleString("pt-BR")}
            sub="terceirizados cadastrados"
            icon={<Bike className="size-5" strokeWidth={2} />}
          />
        </div>

        <div className="col-span-12 xl:col-span-8">
          <RecentCanhotosTable entregas={entregasRecentes} />
        </div>

        <div className="col-span-12 xl:col-span-4">
          <MotoboyMapCard />
        </div>

        <div className="col-span-12 xl:col-span-6">
          <AlertsPanel alertas={alertas} />
        </div>

        <div className="col-span-12 xl:col-span-6">
          <ActivityTimeline atividades={atividade} />
        </div>
      </div>
    </div>
  );
}
