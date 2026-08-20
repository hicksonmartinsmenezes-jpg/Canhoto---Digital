import { Package } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  FORMA_PAGAMENTO_LABEL,
  STATUS_BADGE_CLASSES,
  STATUS_LABEL,
} from "@/lib/status";
import type { EntregaRecente } from "@/lib/data/entregas";

interface RecentCanhotosTableProps {
  entregas: EntregaRecente[];
}

export function RecentCanhotosTable({ entregas }: RecentCanhotosTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-5">
        <h2 className="text-[17px] font-bold">Entregas recentes</h2>
        <button className="rounded-lg border border-amber-500/25 px-3 py-1.5 text-xs font-bold text-amber-600 transition-[transform,background-color] duration-150 hover:bg-amber-500/5 active:scale-[0.97]">
          Ver todas
        </button>
      </div>
      {entregas.length === 0 ? (
        <EmptyState
          compact
          icon={Package}
          title="Nenhuma entrega cadastrada ainda"
          action={{ label: "Nova Entrega", href: "/canhotos/nova" }}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/70 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                <th className="px-6 py-3.5 font-bold">Nº</th>
                <th className="px-6 py-3.5 font-bold">Cliente</th>
                <th className="px-6 py-3.5 font-bold">Valor</th>
                <th className="px-6 py-3.5 font-bold">Pagamento</th>
                <th className="px-6 py-3.5 font-bold">Data</th>
                <th className="px-6 py-3.5 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {entregas.map((e) => (
                <tr
                  key={e.numero}
                  className="border-t border-slate-200/60 text-sm transition-colors hover:bg-slate-50/70"
                >
                  <td className="px-6 py-3.5 font-medium tabular-nums text-slate-500">
                    {e.numero}
                  </td>
                  <td className="px-6 py-3.5 font-bold">{e.cliente}</td>
                  <td className="px-6 py-3.5 tabular-nums">{e.valor}</td>
                  <td className="px-6 py-3.5 text-slate-500">
                    {FORMA_PAGAMENTO_LABEL[e.formaPagamento]}
                  </td>
                  <td className="px-6 py-3.5 tabular-nums text-slate-500">
                    {e.data}
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE_CLASSES[e.status]}`}
                    >
                      <span
                        className={`size-1.5 rounded-full bg-current ${e.status === "pendente" ? "animate-pulse" : ""}`}
                      />
                      {STATUS_LABEL[e.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
