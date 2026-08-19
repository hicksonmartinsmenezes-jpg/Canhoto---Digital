import { Bike } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentCanhotosTable } from "@/components/dashboard/RecentCanhotosTable";
import { MotoboyMapCard } from "@/components/dashboard/MotoboyMapCard";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="Dashboard" beta />

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard
            label="Total de entregas"
            value="1.248"
            sub="vs. mês anterior"
            trend={{ value: "12,5%", tone: "good" }}
            variant="accent"
          />
        </div>

        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard
            label="Entregues"
            value="1.046"
            sub="1.046 de 1.248 entregas"
            mini={{ label: "Eficiência", value: "83,8%" }}
          />
        </div>

        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard
            label="Pendentes"
            value="156"
            sub="aguardando saída ou confirmação"
            trend={{ value: "2,7%", tone: "bad" }}
          />
        </div>

        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard
            label="Motoristas ativos"
            value="8"
            sub="terceirizados em rota"
            icon={<Bike className="size-5" strokeWidth={2} />}
          />
        </div>

        <div className="col-span-12 xl:col-span-8">
          <RecentCanhotosTable />
        </div>

        <div className="col-span-12 xl:col-span-4">
          <MotoboyMapCard />
        </div>

        <div className="col-span-12 xl:col-span-6">
          <AlertsPanel />
        </div>

        <div className="col-span-12 xl:col-span-6">
          <ActivityTimeline />
        </div>
      </div>
    </div>
  );
}
