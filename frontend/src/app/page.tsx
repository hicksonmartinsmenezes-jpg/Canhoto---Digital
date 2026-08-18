import { Users } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentCanhotosTable } from "@/components/dashboard/RecentCanhotosTable";
import { StatusDonutChart } from "@/components/dashboard/StatusDonutChart";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Visão geral do sistema de canhotos internos.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard
            label="Total de canhotos"
            value="1.248"
            sub="vs. mês anterior"
            trend={{ value: "12,5%", tone: "good" }}
          />
        </div>

        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard
            label="Canhotos arquivados"
            value="982"
            sub="982 de 1.248 canhotos"
            mini={{ label: "Eficiência", value: "78,6%" }}
          />
        </div>

        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard
            label="Pendentes"
            value="156"
            sub="aguardando assinatura"
            trend={{ value: "2,7%", tone: "bad" }}
          />
        </div>

        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard
            label="Responsáveis"
            value="42"
            sub="ativos nos setores"
            icon={<Users className="size-5" strokeWidth={2} />}
          />
        </div>

        <div className="col-span-12 xl:col-span-8">
          <RecentCanhotosTable />
        </div>

        <div className="col-span-12 xl:col-span-4">
          <StatusDonutChart />
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
