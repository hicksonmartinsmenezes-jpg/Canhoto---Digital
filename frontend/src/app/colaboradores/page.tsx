import { Plus, SquarePen, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { COLABORADORES, PAPEL_LABEL } from "@/lib/colaboradores-mock";

export default function ColaboradoresPage() {
  return (
    <div>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Colaboradores</h1>
          
        </div>
        <button className="inline-flex items-center gap-1.5 bg-amber-500 px-5 py-2.5 text-sm font-bold text-[#0A1F44] hover:bg-amber-400">
          <Plus className="size-4" strokeWidth={2.5} />
          Novo Colaborador
        </button>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-[15px] font-bold">
            {COLABORADORES.length} colaboradores encontrados
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3.5 font-bold">Nome</th>
                <th className="px-6 py-3.5 font-bold">E-mail</th>
                <th className="px-6 py-3.5 font-bold">Setor</th>
                <th className="px-6 py-3.5 font-bold">Cargo</th>
                <th className="px-6 py-3.5 font-bold">Papel</th>
                <th className="px-6 py-3.5 font-bold">Status</th>
                <th className="px-6 py-3.5 font-bold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {COLABORADORES.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-100 text-sm last:border-b-0 hover:bg-slate-50/70"
                >
                  <td className="px-6 py-4 font-semibold">{c.nome}</td>
                  <td className="px-6 py-4 text-slate-500">
                    {c.email ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-500">{c.setor}</td>
                  <td className="px-6 py-4 text-slate-500">
                    {c.cargo ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {PAPEL_LABEL[c.papel]}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${
                        c.ativo
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      {c.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        aria-label="Editar colaborador"
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
