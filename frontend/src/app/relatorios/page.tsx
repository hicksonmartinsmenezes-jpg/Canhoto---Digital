import Link from "next/link";
import { Download, FileBarChart, Filter, Package, Wallet, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getRelatorioEntregas } from "@/lib/data/entregas";
import {
  FORMA_PAGAMENTO_LABEL,
  STATUS_BADGE_CLASSES,
  STATUS_LABEL,
  isDataIsoValida,
  isFormaPagamento,
  isStatusEntrega,
} from "@/lib/status";

export const dynamic = "force-dynamic";

interface RelatoriosPageProps {
  // Next 16: searchParams chega como Promise em Server Component (mesmo
  // padrão de /canhotos, Issue #7).
  searchParams: Promise<{
    inicio?: string;
    fim?: string;
    status?: string;
    forma?: string;
  }>;
}

// "AAAA-MM-DD" de hoje e do primeiro dia do mês corrente, em horário local
// (mesmo cuidado de `paraChaveDiaLocal` em lib/data/entregas.ts — não usa
// toISOString(), que converte pra UTC e pode empurrar pro dia errado).
function periodoPadrao(): { inicio: string; fim: string } {
  const hoje = new Date();
  const chave = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return { inicio: chave(primeiroDiaMes), fim: chave(hoje) };
}

export default async function RelatoriosPage({ searchParams }: RelatoriosPageProps) {
  const params = await searchParams;
  const padrao = periodoPadrao();

  // Sem filtro de data nos searchParams (primeira visita à tela): usa o mês
  // corrente como período padrão, em vez de trazer o histórico inteiro sem
  // nenhum recorte — o usuário ainda pode limpar/trocar pelo formulário.
  const dataInicio = isDataIsoValida(params.inicio) ? params.inicio : padrao.inicio;
  const dataFim = isDataIsoValida(params.fim) ? params.fim : padrao.fim;
  const status = isStatusEntrega(params.status) ? params.status : undefined;
  const formaPagamento = isFormaPagamento(params.forma) ? params.forma : undefined;

  const { itens, totais } = await getRelatorioEntregas({
    dataInicio,
    dataFim,
    status,
    formaPagamento,
  });

  const temFiltroExtra = Boolean(status || formaPagamento);
  const queryExport = new URLSearchParams({ inicio: dataInicio, fim: dataFim });
  if (status) queryExport.set("status", status);
  if (formaPagamento) queryExport.set("forma", formaPagamento);

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="mt-1 text-sm text-slate-500">
          Consulte e exporte as entregas registradas por período, situação e forma de pagamento.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Entregas no período"
          value={String(totais.quantidade)}
          sub={`${dataInicio.split("-").reverse().join("/")} a ${dataFim.split("-").reverse().join("/")}`}
          icon={<Package className="size-5" strokeWidth={2} />}
        />
        <StatCard
          label="Valor total"
          value={totais.valorTotal}
          sub="Soma do valor de pagamento das entregas filtradas"
          icon={<Wallet className="size-5" strokeWidth={2} />}
        />
        <StatCard
          label="Ticket médio"
          value={totais.ticketMedio}
          sub="Valor total dividido pela quantidade de entregas"
          icon={<FileBarChart className="size-5" strokeWidth={2} />}
        />
      </div>

      <Card className="mb-6 overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-[15px] font-bold">Filtros</h2>
        </div>
        {/* Form GET simples, mesmo padrão de /canhotos (Issue #7): recarrega
            a página com os parâmetros na URL, sem precisar de client
            component. O botão "Exportar CSV" também é um link GET, pros
            mesmos filtros — ver /relatorios/exportar/route.ts. */}
        <form className="flex flex-wrap items-end gap-3 px-6 py-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              De
            </span>
            <input
              type="date"
              name="inicio"
              defaultValue={dataInicio}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 outline-none transition-colors focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Até
            </span>
            <input
              type="date"
              name="fim"
              defaultValue={dataFim}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 outline-none transition-colors focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Situação
            </span>
            <select
              name="status"
              defaultValue={status ?? ""}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 outline-none transition-colors focus:border-slate-400"
            >
              <option value="">Todas</option>
              <option value="entregue">Entregue</option>
              <option value="pendente">Pendente</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Pagamento
            </span>
            <select
              name="forma"
              defaultValue={formaPagamento ?? ""}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 outline-none transition-colors focus:border-slate-400"
            >
              <option value="">Todas</option>
              {Object.entries(FORMA_PAGAMENTO_LABEL).map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            aria-label="Aplicar filtros"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 transition-[transform,color,border-color] duration-150 hover:border-amber-500/40 hover:text-amber-600 active:scale-95"
          >
            <Filter className="size-4" />
            Filtrar
          </button>
          {temFiltroExtra && (
            <Link
              href={`/relatorios?inicio=${dataInicio}&fim=${dataFim}`}
              aria-label="Limpar filtros de situação e pagamento"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 transition-[transform,color,border-color] duration-150 hover:border-red-500/40 hover:text-red-600 active:scale-95"
            >
              <X className="size-4" />
              Limpar
            </Link>
          )}

          <Link
            href={`/relatorios/exportar?${queryExport.toString()}`}
            className="ml-auto inline-flex items-center gap-1.5 bg-[#0A1F44] px-4 py-2 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-[#0A1F44]/90 active:scale-[0.97]"
          >
            <Download className="size-4" />
            Exportar CSV
          </Link>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-[15px] font-bold">
            {itens.length} {itens.length === 1 ? "entrega encontrada" : "entregas encontradas"}
          </h2>
        </div>

        {itens.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhuma entrega encontrada"
            description="Ajuste o período ou os filtros acima e tente novamente."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3.5 font-bold">Código</th>
                  <th className="px-6 py-3.5 font-bold">Data</th>
                  <th className="px-6 py-3.5 font-bold">Cliente</th>
                  <th className="px-6 py-3.5 font-bold">Valor</th>
                  <th className="px-6 py-3.5 font-bold">Pagamento</th>
                  <th className="px-6 py-3.5 font-bold">Motorista</th>
                  <th className="px-6 py-3.5 font-bold">Situação</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 text-sm transition-colors last:border-b-0 hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4 font-medium tabular-nums text-slate-500">
                      {item.numero}
                    </td>
                    <td className="px-6 py-4 tabular-nums text-slate-500">{item.data}</td>
                    <td className="px-6 py-4 font-semibold">{item.cliente}</td>
                    <td className="px-6 py-4 tabular-nums">{item.valor}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {FORMA_PAGAMENTO_LABEL[item.formaPagamento]}
                    </td>
                    <td className="px-6 py-4">
                      <span className={item.motoboy ? "" : "text-slate-300"}>
                        {item.motoboy ?? "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[item.status]}`}
                      >
                        {STATUS_LABEL[item.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
