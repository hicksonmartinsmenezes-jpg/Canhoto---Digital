import { CalendarClock, CheckCircle2, FileClock, FileWarning } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Alerta } from "@/lib/data/entregas";

const TOM_STYLES: Record<
  Alerta["tom"],
  { icon: typeof FileWarning; iconClass: string; tagClass: string }
> = {
  critico: {
    icon: FileWarning,
    iconClass: "bg-red-600/10 text-red-600",
    tagClass: "text-red-600",
  },
  atencao: {
    icon: FileClock,
    iconClass: "bg-amber-500/10 text-amber-500",
    tagClass: "text-amber-600",
  },
  info: {
    icon: CalendarClock,
    iconClass: "bg-[#0A1F44]/10 text-[#0A1F44]",
    tagClass: "text-[#0A1F44]",
  },
};

interface AlertsPanelProps {
  alertas: Alerta[];
}

export function AlertsPanel({ alertas }: AlertsPanelProps) {
  return (
    <Card className="p-7">
      <div className="mb-[22px] flex items-center justify-between">
        <h2 className="text-[17px] font-bold">Alertas e pendências</h2>
        {alertas.length > 0 && (
          <span className="relative size-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-red-600/60" />
            <span className="absolute inset-0 rounded-full bg-red-600" />
          </span>
        )}
      </div>

      {alertas.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-4">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" strokeWidth={2} />
          <p className="text-sm font-semibold text-emerald-700">
            Tudo em dia — nenhuma pendência no momento.
          </p>
        </div>
      ) : (
        <div>
          {alertas.map((a) => {
            const style = TOM_STYLES[a.tom];
            const Icon = style.icon;
            return (
              <div
                key={a.id}
                className="mb-3.5 flex items-start gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4 transition-colors last:mb-0 hover:border-amber-500/35"
              >
                <span
                  className={`grid size-[46px] shrink-0 place-items-center rounded-xl ${style.iconClass}`}
                >
                  <Icon className="size-[22px]" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold">{a.titulo}</p>
                    <span
                      className={`whitespace-nowrap text-[10px] font-bold ${style.tagClass}`}
                    >
                      {a.tag}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {a.descricao}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
