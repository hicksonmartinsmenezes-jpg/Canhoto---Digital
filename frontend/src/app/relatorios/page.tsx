import Link from "next/link";
import {
  Download,
  Eye,
  FileBarChart,
  Filter,
  Package,
  Wallet,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { CampoPeriodo } from "@/components/ui/CampoPeriodo";
import { EmptyState } from "@/components/ui/EmptyState";
import { getRelatorioEntregas } from "@/lib/data/entregas";
import { getMotoboys } from "@/lib/data/motoboys";
import { obterSessaoOperador, setorIdParaFiltro } from "@/lib/sessao-operador";
import {
  FORMA_PAGAMENTO_LABEL,
  SITUACAO_TEXT_CLASSES,
  SITUACAO_LABEL,
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
    motorista?: string;
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
  // Só entregue e cancelado: o que está em aberto fica na tela Entregas.
  const status =
    isStatusEntrega(params.status) && params.status !== "pendente"
      ? params.status
      : undefined;
  const formaPagamento = isFormaPagamento(params.forma) ? params.forma : undefined;
  const motoboyId =
    params.motorista && /^[0-9a-f-]{36}$/i.test(params.motorista)
      ? params.motorista
      : undefined;

  const sessao = await obterSessaoOperador();
  const [{ itens, totais }, motoboys] = await Promise.all([
    getRelatorioEntregas({
      dataInicio,
      dataFim,
      status,
      formaPagamento,
      motoboyId,
      setorId: setorIdParaFiltro(sessao),
    }),
    getMotoboys(),
  ]);

  const temFiltroExtra = Boolean(status || formaPagamento || motoboyId);
  const queryExport = new URLSearchParams({ inicio: dataInicio, fim: dataFim });
  if (status) queryExport.set("status", status);
  if (formaPagamento) queryExport.set("forma", formaPagamento);
  if (motoboyId) queryExport.set("motorista", motoboyId);

  // Link de cada entrega: abre os dados completos e volta para estes filtros.
  const voltarParaRelatorio = encodeURIComponent(
    `/relatorios?${queryExport.toString()}`
  );
  const linkDaEntrega = (id: string) =>
    `/canhotos/${id}?voltar=${voltarParaRelatorio}`;

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Entregas no período"
          value={String(totais.quantidade)}
          icon={<Package className="size-5" strokeWidth={2} />}
          iconBare
        />
        <StatCard
          label="Valor total"
          value={totais.valorTotal}
          icon={<Wallet className="size-5" strokeWidth={2} />}
          iconBare
        />
        <StatCard
          label="Ticket médio"
          value={totais.ticketMedio}
          icon={<FileBarChart className="size-5" strokeWidth={2} />}
          iconBare
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
          <CampoPeriodo
            nomeInicio="inicio"
            nomeFim="fim"
            valorInicio={dataInicio}
            valorFim={dataFim}
            className="gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"
          />
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

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Motorista
            </span>
            <select
              name="motorista"
              defaultValue={motoboyId ?? ""}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 outline-none transition-colors focus:border-slate-400"
            >
              <option value="">Todos</option>
              {motoboys.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
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
              prefetch={false}
              aria-label="Limpar filtros de situação, pagamento e motorista"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 transition-[transform,color,border-color] duration-150 hover:border-red-500/40 hover:text-red-600 active:scale-95"
            >
              <X className="size-4" />
              Limpar
            </Link>
          )}

          {/* <a> comum (não <Link>): o <Link> pré-carregava a rota de
              exportação sozinho, gerando e arquivando CSVs sem ninguém
              pedir. */}
          <a
            href={`/relatorios/exportar?${queryExport.toString()}`}
            download
            className="ml-auto inline-flex items-center gap-1.5 bg-[#0A1F44] px-4 py-2 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-[#0A1F44]/90 active:scale-[0.97]"
          >
            <Download className="size-4" />
            Exportar CSV
          </a>
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
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-[88px]" />
                <col className="w-[116px]" />
                <col />
                <col className="w-[132px]" />
                <col className="w-[132px]" />
                <col className="w-[156px]" />
                <col className="w-[132px]" />
                <col className="w-[148px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="py-3.5 pl-6 pr-3 font-bold">Código</th>
                  <th className="px-3 py-3.5 font-bold">Data</th>
                  <th className="px-3 py-3.5 font-bold">Cliente</th>
                  <th className="py-3.5 pl-3 pr-8 text-right font-bold">Valor</th>
                  <th className="px-3 py-3.5 font-bold">Pagamento</th>
                  <th className="px-3 py-3.5 font-bold">Motorista</th>
                  <th className="px-3 py-3.5 font-bold">Situação</th>
                  <th className="py-3.5 pl-3 pr-6 text-right font-bold">Dados</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700">
                {itens.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50/70"
                  >
                    <td className="whitespace-nowrap py-3.5 pl-6 pr-3 align-middle font-medium tabular-nums text-slate-500">
                      {item.numero}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 align-middle tabular-nums">
                      {item.data}
                    </td>
                    <td className="truncate px-3 py-3.5 align-middle font-semibold text-slate-900">
                      <Link
                        href={linkDaEntrega(item.id)}
                        prefetch={false}
                        className="hover:text-[#1768D8] hover:underline"
                      >
                        {item.cliente}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap py-3.5 pl-3 pr-8 text-right align-middle tabular-nums">
                      {item.valor}
                    </td>
                    <td className="truncate px-3 py-3.5 align-middle">
                      {FORMA_PAGAMENTO_LABEL[item.formaPagamento]}
                    </td>
                    <td className="truncate px-3 py-3.5 align-middle">
                      <span className={item.motoboy ? "" : "text-slate-300"}>
                        {item.motoboy ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 align-middle">
                      <span
                        className={`flex items-center whitespace-nowrap text-sm font-semibold ${SITUACAO_TEXT_CLASSES[item.situacao]}`}
                      >
                        {SITUACAO_LABEL[item.situacao]}
                      </span>
                    </td>
                    <td className="py-3.5 pl-3 pr-6 text-right align-middle">
                      <Link
                        href={linkDaEntrega(item.id)}
                        prefetch={false}
                        aria-label={`Ver dados da entrega ${item.numero}`}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap border border-slate-300 px-3 py-1.5 text-xs font-bold text-black transition hover:border-black hover:bg-slate-50"
                      >
                        <Eye className="size-4" />
                        Ver dados
                      </Link>
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
