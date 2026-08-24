import { Package } from "lucide-react";
import {
  FORMA_PAGAMENTO_LABEL,
  STATUS_BADGE_CLASSES,
  STATUS_LABEL,
} from "@/lib/status";
import { EntregaRowActions } from "@/components/canhotos/EntregaRowActions";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EntregaListItem } from "@/lib/data/entregas";

function Cell({ value }: { value: string | null }) {
  return <span className={value ? "" : "text-slate-300"}>{value ?? "—"}</span>;
}

interface CanhotosTableProps {
  entregas: EntregaListItem[];
}

export function CanhotosTable({ entregas }: CanhotosTableProps) {
  if (entregas.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Nenhuma entrega cadastrada ainda"
        description="Comece cadastrando a primeira entrega do dia."
        action={{ label: "Nova Entrega", href: "/canhotos/nova" }}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
            <th className="px-6 py-3.5 font-bold">Código</th>
            <th className="px-6 py-3.5 font-bold">Data</th>
            <th className="px-6 py-3.5 font-bold">Cliente</th>
            <th className="px-6 py-3.5 font-bold">Nº NFe</th>
            <th className="px-6 py-3.5 font-bold">Valor</th>
            <th className="px-6 py-3.5 font-bold">Pagamento</th>
            <th className="px-6 py-3.5 font-bold">Motorista</th>
            <th className="px-6 py-3.5 font-bold">Situação</th>
            <th className="px-6 py-3.5 font-bold">Ações</th>
          </tr>
        </thead>
        <tbody>
          {entregas.map((c) => (
            <tr
              key={c.id}
              className="border-b border-slate-100 text-sm transition-colors last:border-b-0 hover:bg-slate-50/70"
            >
              <td className="px-6 py-4 font-medium tabular-nums text-slate-500">
                {c.numero}
              </td>
              <td className="px-6 py-4 tabular-nums text-slate-500">
                {c.data}
              </td>
              <td className="px-6 py-4 font-semibold">{c.cliente}</td>
              <td className="px-6 py-4 tabular-nums">
                <Cell value={c.numeroNfe} />
              </td>
              <td className="px-6 py-4 tabular-nums">{c.valor}</td>
              <td className="px-6 py-4 text-slate-500">
                {FORMA_PAGAMENTO_LABEL[c.formaPagamento]}
              </td>
              <td className="px-6 py-4">
                <Cell value={c.motoboy} />
              </td>
              <td className="px-6 py-4">
                <span
                  className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[c.status]}`}
                >
                  {STATUS_LABEL[c.status]}
                </span>
              </td>
              <td className="px-6 py-4">
                <EntregaRowActions id={c.id} numero={c.numero} cliente={c.cliente} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
