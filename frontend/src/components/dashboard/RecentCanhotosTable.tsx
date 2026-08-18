import { Card } from "@/components/ui/Card";
import { STATUS_BADGE_CLASSES, STATUS_LABEL } from "@/lib/status";
import { CANHOTOS_RECENTES } from "@/lib/dashboard-mock";

export function RecentCanhotosTable() {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-6 py-[22px]">
        <h2 className="text-[17px] font-bold">Canhotos recentes</h2>
        <button className="rounded-lg border border-amber-500/25 px-3 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-500/5">
          Ver todos
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-left">
          <thead>
            <tr className="bg-zinc-50/70 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              <th className="px-6 py-3.5 font-bold">Nº</th>
              <th className="px-6 py-3.5 font-bold">Documento</th>
              <th className="px-6 py-3.5 font-bold">Responsável</th>
              <th className="px-6 py-3.5 font-bold">Setor</th>
              <th className="px-6 py-3.5 font-bold">Data</th>
              <th className="px-6 py-3.5 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {CANHOTOS_RECENTES.map((c) => (
              <tr
                key={c.numero}
                className="border-t border-zinc-200/60 text-sm hover:bg-zinc-50/70"
              >
                <td className="px-6 py-3.5 font-medium tabular-nums text-zinc-400">
                  {c.numero}
                </td>
                <td className="px-6 py-3.5 font-bold">{c.documento}</td>
                <td className="px-6 py-3.5">{c.responsavel}</td>
                <td className="px-6 py-3.5 text-zinc-400">{c.setor}</td>
                <td className="px-6 py-3.5 tabular-nums text-zinc-400">
                  {c.data}
                </td>
                <td className="px-6 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE_CLASSES[c.status]}`}
                  >
                    <span
                      className={`size-1.5 rounded-full bg-current ${c.status === "pendente" ? "animate-pulse" : ""}`}
                    />
                    {STATUS_LABEL[c.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
