import { Plus, SquarePen, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { MOTOBOYS } from "@/lib/motoboys-mock";

export default function MotoboysPage() {
  return (
    <div>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Motoristas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Entregadores terceirizados que fazem as entregas — sem login no
            sistema, só um cadastro de referência.
          </p>
        </div>
        <button className="inline-flex items-center gap-1.5 bg-amber-500 px-5 py-2.5 text-sm font-bold text-[#0A1F44] hover:bg-amber-400">
          <Plus className="size-4" strokeWidth={2.5} />
          Novo Motorista
        </button>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-[15px] font-bold">
            {MOTOBOYS.length} motoristas cadastrados
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3.5 font-bold">Nome</th>
                <th className="px-6 py-3.5 font-bold">Entregas no mês</th>
                <th className="px-6 py-3.5 font-bold">Status</th>
                <th className="px-6 py-3.5 font-bold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {MOTOBOYS.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-slate-100 text-sm last:border-b-0 hover:bg-slate-50/70"
                >
                  <td className="px-6 py-4 font-semibold">{m.nome}</td>
                  <td className="px-6 py-4 tabular-nums text-slate-500">
                    {m.entregasNoMes}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${
                        m.ativo
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      {m.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        aria-label="Editar motorista"
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-amber-500/40 hover:text-amber-600"
                      >
                        <SquarePen className="size-4" />
                      </button>
                      <button
                        aria-label="Mais ações"
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-amber-500/40 hover:text-amber-600"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
