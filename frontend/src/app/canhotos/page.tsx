import { Filter, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CanhotosTable } from "@/components/canhotos/CanhotosTable";
import { CANHOTOS } from "@/lib/canhotos-mock";

export default function CanhotosPage() {
  return (
    <div>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entregas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Registro de entregas ao cliente: valor, forma de pagamento,
            motorista responsável e status de cada entrega.
          </p>
        </div>
        <button className="inline-flex items-center gap-1.5 bg-amber-500 px-5 py-2.5 text-sm font-bold text-[#0A1F44] hover:bg-amber-400">
          <Plus className="size-4" strokeWidth={2.5} />
          Adicionar Entrega
        </button>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-5">
          <h2 className="text-[15px] font-bold">
            {CANHOTOS.length} entregas encontradas
          </h2>
          <div className="flex items-center gap-2">
            <select className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 outline-none focus:border-amber-500/50">
              <option>Filtrar situação</option>
              <option>Entregue</option>
              <option>Pendente</option>
              <option>Cancelado</option>
            </select>
            <button
              aria-label="Aplicar filtro"
              className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:border-amber-500/40 hover:text-amber-600"
            >
              <Filter className="size-4" />
            </button>
          </div>
        </div>

        <CanhotosTable />
      </Card>
    </div>
  );
}
