import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileClock,
  FileWarning,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
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

      {/* Estado vazio padronizado com o mesmo componente que "Atividade
          recente" e "Entregas recentes" usam (Hickson pediu, 21/08/2026) —
          antes era uma caixa verde só deste card, com texto próprio ("Tudo
          em dia — nenhuma pendência no momento."), destoando do resto do
          Dashboard. */}
      {alertas.length === 0 ? (
        <EmptyState compact icon={CheckCircle2} title="Nenhuma pendência no momento" />
      ) : (
        <div>
          {alertas.map((a) => {
            const style = TOM_STYLES[a.tom];
            const Icon = style.icon;
            const conteudo = (
              <>
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
                {a.href && (
                  <ChevronRight className="mt-2.5 size-4 shrink-0 self-start text-slate-300" />
                )}
              </>
            );

            // Issue #9: o alerta de conferência de caixa agora leva direto
            // pra lista de Entregas, onde a ação "Conferir" fica disponível
            // em cada linha pendente — os outros alertas (ainda sem ação
            // própria) continuam como um card estático.
            return a.href ? (
              <Link
                key={a.id}
                href={a.href}
                className="mb-3.5 flex items-start gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4 transition-colors last:mb-0 hover:border-amber-500/35 hover:bg-amber-500/5"
              >
                {conteudo}
              </Link>
            ) : (
              <div
                key={a.id}
                className="mb-3.5 flex items-start gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4 transition-colors last:mb-0 hover:border-amber-500/35"
              >
                {conteudo}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
