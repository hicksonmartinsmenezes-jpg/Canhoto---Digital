import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
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
  getMotoristasEmRota,
} from "@/lib/data/entregas";
import { obterSessaoOperador, setorIdParaFiltro } from "@/lib/sessao-operador";

// Renderiza a cada request — o Dashboard é operacional e consulta o PostgreSQL local.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sessao = await obterSessaoOperador();
  const setorId = setorIdParaFiltro(sessao);

  // Tudo no Dashboard (números, alertas, atividade, gráfico e mapa) respeita
  // o setor do gestor_setor; sem sessão válida nada é mostrado.
  const [
    stats,
    alertas,
    atividade,
    entregasPorDia,
    motoristasEmRota,
  ] = await Promise.all([
    getDashboardStats(setorId),
    getAlertas(setorId),
    getAtividadeRecente(4, setorId),
    getEntregasPorDia(90, setorId),
    getMotoristasEmRota(setorId),
  ]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        beta
        alertas={alertas}
        mostrarTreinamento={sessao?.tipo === "admin"}
      />

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

        {/* Alertas e Atividade recente (Issue #44) — ficam logo depois
            dos StatCards, antes do gráfico operacional. */}
        <div className="col-span-12 xl:col-span-8">
          <AlertsPanel alertas={alertas} />
        </div>

        <div className="col-span-12 xl:col-span-4">
          <ActivityTimeline atividades={atividade} />
        </div>

        {/* Gráfico de tendência operacional em largura total. */}
        <div className="col-span-12">
          <EntregasPorDiaChart dados={entregasPorDia} />
        </div>

        <div className="col-span-12">
          <MotoboyMapCard motoristasIniciais={motoristasEmRota} />
        </div>
      </div>
    </div>
  );
}
