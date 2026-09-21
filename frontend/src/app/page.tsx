import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentCanhotosTable } from "@/components/dashboard/RecentCanhotosTable";
import { MotoboyMapCard } from "@/components/dashboard/MotoboyMapCard";
import { MotoristasStatCard } from "@/components/dashboard/MotoristasStatCard";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { EntregasPorDiaChart } from "@/components/dashboard/EntregasPorDiaChart";
import {
  getAlertas,
  getAtividadeRecente,
  getDashboardStats,
  getEntregasPorDia,
  getEntregasRecentes,
  getMotoristasEmRota,
} from "@/lib/data/entregas";
import { obterSessaoOperador, setorIdParaFiltro } from "@/lib/sessao-operador";

// Renderiza a cada request — o Dashboard é operacional e consulta o PostgreSQL local.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sessao = await obterSessaoOperador();
  const setorId = setorIdParaFiltro(sessao);

  // Alertas, Atividade recente, o gráfico por dia e o mapa de motoristas
  // ainda não são escopados por setor (Issue seguinte, se for preciso) —
  // por enquanto eles continuam mostrando a operação inteira mesmo pra um
  // gestor_setor logado. Só os números principais (StatCards) e a tabela
  // de entregas recentes já respeitam o setor.
  const [
    stats,
    entregasRecentes,
    alertas,
    atividade,
    entregasPorDia,
    motoristasEmRota,
  ] = await Promise.all([
    getDashboardStats(setorId),
    getEntregasRecentes(5, setorId),
    getAlertas(),
    getAtividadeRecente(4),
    getEntregasPorDia(90),
    getMotoristasEmRota(),
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
          <MotoristasStatCard
            ativos={stats.motoristasAtivos}
            emRotaIniciais={motoristasEmRota}
          />
        </div>

        {/* Alertas e Atividade recente (Issue #44) — movidos pra cima do
            gráfico "Entregas por dia" a pedido do Hickson, ficando logo
            depois dos StatCards. Split 8/4, mesma proporção usada mais
            abaixo entre Entregas recentes e Motoristas em tempo real. */}
        <div className="col-span-12 xl:col-span-8">
          <AlertsPanel alertas={alertas} />
        </div>

        <div className="col-span-12 xl:col-span-4">
          <ActivityTimeline atividades={atividade} />
        </div>

        {/* Gráfico de tendência (Issue #25) — o Dashboard ficou sem
            nenhuma visão ao longo do tempo depois que o donut de status
            virou o mapa de motoristas. Linha própria, largura cheia, entre
            os StatCards e as duas linhas de cards que já existiam. */}
        <div className="col-span-12">
          <EntregasPorDiaChart dados={entregasPorDia} />
        </div>

        <div className="col-span-12">
          <RecentCanhotosTable entregas={entregasRecentes} />
        </div>

        <div className="col-span-12">
          <MotoboyMapCard motoristasIniciais={motoristasEmRota} />
        </div>
      </div>
    </div>
  );
}
