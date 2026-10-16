import Link from "next/link";
import { Package, SearchX } from "lucide-react";
import {
  FORMA_PAGAMENTO_LABEL,
  SITUACAO_LABEL,
  SITUACAO_TEXT_CLASSES,
} from "@/lib/status";
import { EntregaRowActions } from "@/components/canhotos/EntregaRowActions";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EntregaListItem } from "@/lib/data/entregas";

function Cell({ value }: { value: string | null }) {
  return <span className={value ? "" : "text-slate-300"}>{value ?? "—"}</span>;
}

function Situacao({ entrega }: { entrega: EntregaListItem }) {
  return (
    <span
      className={`flex items-center gap-2 whitespace-nowrap text-sm font-semibold ${SITUACAO_TEXT_CLASSES[entrega.situacao]}`}
    >
      {SITUACAO_LABEL[entrega.situacao]}
    </span>
  );
}

interface CanhotosTableProps {
  entregas: EntregaListItem[];
  /** Há busca/filtro ativo: a mensagem de lista vazia muda. */
  filtrada?: boolean;
  /** Só o Admin exclui; gestor de setor só cancela. */
  podeExcluir?: boolean;
}

export function CanhotosTable({
  entregas,
  filtrada = false,
  podeExcluir = true,
}: CanhotosTableProps) {
  if (entregas.length === 0) {
    return filtrada ? (
      <EmptyState
        icon={SearchX}
        title="Nenhuma entrega encontrada"
        description="Confira a busca e os filtros, ou toque em Limpar."
      />
    ) : (
      <EmptyState
        icon={Package}
        title="Nenhuma entrega aguardando saída ou em rota"
      />
    );
  }

  return (
    <>
      {/* Celular: cartões (a tabela larga cortava Situação e Ações). */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {entregas.map((c) => (
          <li key={c.id} className="flex items-start gap-3 px-4 py-4">
            <Link
              href={`/canhotos/${c.id}`}
              prefetch={false}
              className="min-w-0 flex-1"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold tabular-nums text-slate-500">
                  {c.numero}
                </span>
                <Situacao entrega={c} />
              </div>
              <p className="mt-1 truncate text-sm font-bold text-slate-900">
                {c.cliente}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {c.data} · {c.valor} · {FORMA_PAGAMENTO_LABEL[c.formaPagamento]}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {c.motoboy ?? "Sem motorista"}
                {c.numeroNfe ? ` · NF-e ${c.numeroNfe}` : ""}
              </p>
            </Link>
            <EntregaRowActions
              id={c.id}
              numero={c.numero}
              cliente={c.cliente}
              status={c.status}
              aindaNaLoja={c.aindaNaLoja}
              podeExcluir={podeExcluir}
              compacto
            />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        {/* Larguras fixas: cada coluna tem o mesmo tamanho em todas as linhas
            e o cabeçalho fica alinhado com o conteúdo. Cliente usa o espaço
            que sobra. */}
        <table className="w-full min-w-[1100px] table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[88px]" />
            <col className="w-[116px]" />
            <col />
            <col className="w-[132px]" />
            <col className="w-[132px]" />
            <col className="w-[128px]" />
            <col className="w-[156px]" />
            <col className="w-[148px]" />
            <col className="w-[108px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
              <th className="py-3.5 pl-6 pr-3 font-bold">Código</th>
              <th className="px-3 py-3.5 font-bold">Data</th>
              <th className="px-3 py-3.5 font-bold">Cliente</th>
              <th className="px-3 py-3.5 font-bold">Nº NFe</th>
              <th className="py-3.5 pl-3 pr-8 text-right font-bold">Valor</th>
              <th className="px-3 py-3.5 font-bold">Pagamento</th>
              <th className="px-3 py-3.5 font-bold">Motorista</th>
              <th className="px-3 py-3.5 font-bold">Situação</th>
              <th className="py-3.5 pl-3 pr-6 font-bold">Ações</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700">
            {entregas.map((c) => (
              <tr
                key={c.id}
                className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50/70"
              >
                <td className="whitespace-nowrap py-3.5 pl-6 pr-3 align-middle font-medium tabular-nums text-slate-500">
                  {c.numero}
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 align-middle tabular-nums">
                  {c.data}
                </td>
                <td className="truncate px-3 py-3.5 align-middle font-semibold text-slate-900">
                  {c.cliente}
                </td>
                <td className="truncate px-3 py-3.5 align-middle tabular-nums">
                  <Cell value={c.numeroNfe} />
                </td>
                <td className="whitespace-nowrap py-3.5 pl-3 pr-8 text-right align-middle tabular-nums">
                  {c.valor}
                </td>
                <td className="truncate px-3 py-3.5 align-middle">
                  {FORMA_PAGAMENTO_LABEL[c.formaPagamento]}
                </td>
                <td className="truncate px-3 py-3.5 align-middle">
                  <Cell value={c.motoboy} />
                </td>
                <td className="px-3 py-3.5 align-middle">
                  <Situacao entrega={c} />
                </td>
                <td className="py-3.5 pl-3 pr-6 align-middle">
                  <EntregaRowActions
                    id={c.id}
                    numero={c.numero}
                    cliente={c.cliente}
                    status={c.status}
                    aindaNaLoja={c.aindaNaLoja}
                    podeExcluir={podeExcluir}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
