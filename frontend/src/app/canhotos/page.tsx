import Link from "next/link";
import { Filter, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CanhotosTable } from "@/components/canhotos/CanhotosTable";
import { getEntregas } from "@/lib/data/entregas";

export const dynamic = "force-dynamic";

export default async function CanhotosPage() {
  const entregas = await getEntregas();

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entregas</h1>
          
        </div>
        <Link
          href="/canhotos/nova"
          className="inline-flex items-center gap-1.5 bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-amber-400 active:scale-[0.97]"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          Adicionar Entrega
        </Link>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-5">
          <h2 className="text-[15px] font-bold">
            {entregas.length} entregas encontradas
          </h2>
          <div className="flex items-center gap-2">
            <select className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 outline-none transition-colors focus:border-slate-400">
              <option>Filtrar situação</option>
              <option>Entregue</option>
              <option>Pendente</option>
              <option>Cancelado</option>
            </select>
            <button
              aria-label="Aplicar filtro"
              className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition-[transform,color,border-color] duration-150 hover:border-amber-500/40 hover:text-amber-600 active:scale-90"
            >
              <Filter className="size-4" />
            </button>
          </div>
        </div>

        <CanhotosTable entregas={entregas} />
      </Card>
    </div>
  );
}
