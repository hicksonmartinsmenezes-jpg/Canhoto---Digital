import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentCanhotosTable } from "@/components/dashboard/RecentCanhotosTable";
import { MotoboyMapCard } from "@/components/dashboard/MotoboyMapCard";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { EntregasPorDiaChart } from "@/components/dashboard/EntregasPorDiaChart";
import {
  getAlertas,
  getAtividadeRecente,
  getDashboardStats,
  getEntregasPorDia,
  getEntregasRecentes,
} from "@/lib/data/entregas";
import { MOTOBOYS_LOCALIZACAO } from "@/lib/motoboys-localizacao-mock";

// Renderiza a cada request — dados vêm do Supabase (ver claude/modelo-de-dados-site.md),
// não faz sentido cachear estaticamente um dashboard operacional.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, entregasRecentes, alertas, atividade, entregasPorDia] =
    await Promise.all([
      getDashboardStats(),
      getEntregasRecentes(5),
      getAlertas(),
      getAtividadeRecente(4),
      getEntregasPorDia(90), // Issue #42: busca 90 dias; o seletor de período do gráfico filtra no cliente
    ]);

  const eficiencia =
    stats.totalEntregas > 0
      ? ((stats.entregues / stats.totalEntregas) * 100).toFixed(1).replace(".", ",")
      : "0,0";

  return (
    <div>
      <PageHeader title="Dashboard" beta alertas={alertas} />

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard
            label="Total de entregas"
            value={stats.totalEntregas.toLocaleString("pt-BR")}
            sub=""
            variant="accent"
          />
        </div>

        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard
            label="Entregues"
            value={stats.entregues.toLocaleString("pt-BR")}
            sub=""
            mini={{ label: "Eficiência", value: `${eficiencia}%` }}
          />
        </div>

        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard
            label="Pendentes"
            value={stats.pendentes.toLocaleString("pt-BR")}
            sub=""
          />
        </div>

        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          {/* "Em rota" subiu pro mini-badge deste card (antes só aparecia
              no cabeçalho do MotoboyMapCard, mais abaixo) — Hickson pediu
              pra juntar com Motoristas ativos, já que os dois números
              contam a mesma história (quantos cadastrados x quantos em
              entrega agora) e ficam mais fáceis de comparar lado a lado. */}
          <StatCard
            label="Motoristas ativos"
            value={stats.motoristasAtivos.toLocaleString("pt-BR")}
            sub=""
            mini={{ label: "Em rota", value: `${MOTOBOYS_LOCALIZACAO.length}` }}
          />
        </div>

        {/* Gráfico de tendência (Issue #25) — o Dashboard ficou sem
            nenhuma visão ao longo do tempo depois que o donut de status
            virou o mapa de motoristas. Linha própria, largura cheia, entre
            os StatCards e as duas linhas de cards que já existiam. */}
        <div className="col-span-12">
          <EntregasPorDiaChart dados={entregasPorDia} />
        </div>

        <div className="col-span-12 xl:col-span-8">
          <RecentCanhotosTable entregas={entregasRecentes} />
        </div>

        <div className="col-span-12 xl:col-span-4">
          <MotoboyMapCard />
        </div>

        {/* Mesmo split 8/4 da linha acima (Entregas recentes + Motoristas
            em tempo real) — Issue #22: com 6/6 aqui, a divisao vertical
            entre as colunas ficava desalinhada entre as duas linhas. */}
        <div className="col-span-12 xl:col-span-8">
          <AlertsPanel alertas={alertas} />
        </div>

        <div className="col-span-12 xl:col-span-4">
          <ActivityTimeline atividades={atividade} />
        </div>
      </div>
    </div>
  );
}
