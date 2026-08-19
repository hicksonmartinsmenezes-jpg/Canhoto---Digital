import { Card } from "@/components/ui/Card";
import { ATIVIDADE_RECENTE, type AtividadeItem } from "@/lib/dashboard-mock";

const COR_CLASSES: Record<AtividadeItem["cor"], string> = {
  primary: "bg-amber-500",
  success: "bg-emerald-600",
  info: "bg-[#0A1F44]",
  muted: "bg-slate-400",
};

export function ActivityTimeline() {
  return (
    <Card className="p-7">
      <h2 className="mb-7 text-[17px] font-bold">Atividade recente</h2>

      <div className="relative flex flex-col gap-7">
        <div className="absolute top-1.5 bottom-1.5 left-[17px] w-px bg-slate-200" />

        {ATIVIDADE_RECENTE.map((item) => (
          <div key={item.id} className="relative pl-[38px]">
            <span className="absolute top-0.5 left-0 z-10 grid size-[34px] place-items-center rounded-full border border-slate-200 bg-white">
              <span
                className={`size-2.5 rounded-full ${COR_CLASSES[item.cor]}`}
              />
            </span>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold">{item.titulo}</p>
              <span className="text-[10px] font-bold tabular-nums text-slate-400 uppercase">
                {item.hora}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{item.descricao}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
