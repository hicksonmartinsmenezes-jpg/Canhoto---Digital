import { Card } from "@/components/ui/Card";
import { STATUS_HEX } from "@/lib/status";
import { CANHOTOS_POR_STATUS } from "@/lib/dashboard-mock";

const R = 80;
const CIRCUMFERENCE = 2 * Math.PI * R;
const GAP = 3;

export function StatusDonutChart() {
  const total = CANHOTOS_POR_STATUS.reduce((sum, d) => sum + d.value, 0);
  const destaque = CANHOTOS_POR_STATUS[0]; // "Recebidos" — mesmo destaque do protótipo original
  const pctDestaque = Math.round((destaque.value / total) * 100);

  let acc = 0;
  const segments = CANHOTOS_POR_STATUS.map((d) => {
    const frac = d.value / total;
    const len = Math.max(frac * CIRCUMFERENCE - GAP, 0);
    const dashoffset = -acc;
    acc += frac * CIRCUMFERENCE;
    return { ...d, len, dashoffset };
  });

  return (
    <Card className="flex flex-col items-center p-7">
      <h2 className="self-start text-[17px] font-bold">Canhotos por status</h2>

      <div className="relative mt-7 size-48">
        <svg
          viewBox="0 0 200 200"
          width="192"
          height="192"
          role="img"
          aria-label="Distribuição de canhotos por status"
          style={{ transform: "rotate(-90deg)" }}
        >
          {segments.map((s) => (
            <circle
              key={s.status}
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={STATUS_HEX[s.status]}
              strokeWidth="18"
              strokeDasharray={`${s.len} ${CIRCUMFERENCE - s.len}`}
              strokeDashoffset={s.dashoffset}
            >
              <title>
                {s.label}: {s.value} ({((s.value / total) * 100).toFixed(1)}%)
              </title>
            </circle>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[29px] font-extrabold">{pctDestaque}%</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
            {destaque.label}
          </span>
        </div>
      </div>

      <div className="mt-8 flex w-full flex-col gap-3.5">
        {CANHOTOS_POR_STATUS.map((d) => (
          <div key={d.status} className="flex items-center justify-between">
            <span className="flex items-center gap-3 text-sm font-medium text-zinc-500">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: STATUS_HEX[d.status] }}
              />
              {d.label}
            </span>
            <span className="text-sm font-bold tabular-nums">{d.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
