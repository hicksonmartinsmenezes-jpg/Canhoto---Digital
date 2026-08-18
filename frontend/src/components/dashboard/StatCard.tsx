import { ReactNode } from "react";
import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  /** Pílula com variação percentual (ex.: "12,5%"). Omitir junto de `icon`/`mini`. */
  trend?: { value: string; tone: "good" | "bad" };
  /** Ícone à direita do valor, em vez da pílula de tendência. */
  icon?: ReactNode;
  /** Métrica secundária compacta à direita do valor (ex.: "Eficiência 78,6%"). */
  mini?: { label: string; value: string };
}

export function StatCard({ label, value, sub, trend, icon, mini }: StatCardProps) {
  return (
    <Card className="p-[22px]">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </p>
      <div className="mt-3 flex items-end justify-between gap-2">
        <h3 className="text-[34px] font-bold leading-none tracking-tight">
          {value}
        </h3>

        {trend && (
          <span
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-1 text-xs font-bold ${
              trend.tone === "good"
                ? "border-emerald-600/25 bg-emerald-600/10 text-emerald-700"
                : "border-red-600/25 bg-red-600/10 text-red-600"
            }`}
          >
            <TrendingUp className="size-[11px]" strokeWidth={3} />
            {trend.value}
          </span>
        )}

        {icon && (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
            {icon}
          </span>
        )}

        {mini && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase text-emerald-700">
              {mini.label}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {mini.value}
            </span>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-zinc-400">{sub}</p>
    </Card>
  );
}
