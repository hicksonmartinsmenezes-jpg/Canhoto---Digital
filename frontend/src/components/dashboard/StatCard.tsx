import { ReactNode } from "react";
import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  /** Pílula com variação percentual (ex.: "12,5%"). */
  trend?: { value: string; tone: "good" | "bad" };
  /** Ícone à direita do valor (badge redondo). Pode aparecer junto do
   * `trend` — os dois ficam agrupados lado a lado, sem quebrar o alinhamento. */
  icon?: ReactNode;
  /** Métrica secundária compacta à direita do valor (ex.: "Eficiência 78,6%"). */
  mini?: { label: string; value: string };
  /** "accent" = card em destaque (gradiente âmbar → laranja, texto branco
   * sólido) — hoje só o card "Total de entregas" do Dashboard usa. Mesmo
   * layout/estrutura dos demais cards (padrão fixado em 19/08/2026: label
   * em cima, valor + badges numa linha, sub embaixo) — só muda a cor. O
   * gradiente é pintado via `background-image`, então cobre o `bg-white`
   * do Card sem precisar de "!"; a borda usa "!" (Tailwind v4 important
   * modifier) porque `border-color` é a mesma propriedade nos dois casos e
   * só empilhar classe não garante ordem de precedência. */
  variant?: "default" | "accent";
}

export function StatCard({
  label,
  value,
  sub,
  trend,
  icon,
  mini,
  variant = "default",
}: StatCardProps) {
  const accent = variant === "accent";

  return (
    // Gradiente da variante "accent" escurecido um pouco (20/08/2026) —
    // as cores originais (#FCC531 → #F5820C) deixavam o texto branco com
    // contraste apertado em monitores mais claros/mal calibrados.
    <Card
      className={`p-[22px] ${accent ? "border-transparent! bg-linear-to-br from-[#F2B22E] to-[#DE6C09]" : ""}`}
    >
      <p
        className={`text-[13px] font-semibold uppercase tracking-wide ${accent ? "text-white" : "text-[#64748B]"}`}
      >
        {label}
      </p>
      <div className="mt-3 flex items-end justify-between gap-2">
        <h3
          className={`text-[36px] font-bold leading-none tracking-tight ${accent ? "text-white" : "text-[#0F172A]"}`}
        >
          {value}
        </h3>

        {(trend || icon || mini) && (
          <div className="flex items-center gap-2">
            {trend && (
              <span
                className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-1 text-[13px] font-semibold ${
                  accent
                    ? "border-white/30 bg-white/15 text-white"
                    : trend.tone === "good"
                      ? "border-emerald-600/25 bg-emerald-600/10 text-[#1F2937]"
                      : "border-red-600/25 bg-red-600/10 text-[#1F2937]"
                }`}
              >
                <TrendingUp className="size-[11px]" strokeWidth={3} />
                {trend.value}
              </span>
            )}

            {icon && (
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${accent ? "bg-white/15 text-white" : "bg-amber-500/10 text-black"}`}
              >
                {icon}
              </span>
            )}

            {mini && (
              <div className="flex flex-col items-end">
                <span
                  className={`text-[10px] font-bold uppercase ${accent ? "text-white" : "text-emerald-700"}`}
                >
                  {mini.label}
                </span>
                <span
                  className={`text-sm font-semibold tabular-nums ${accent ? "text-white" : ""}`}
                >
                  {mini.value}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Contraste (20/08/2026): subtítulo escurecido um tom (slate-600 em
          vez de slate-500) pra melhorar legibilidade em monitores mais
          claros; na variante "accent" ganha peso médio em vez de normal
          pelo mesmo motivo — texto branco fino sobre o gradiente laranja
          ficava com contraste apertado. */}
      <p
        className={`mt-2 text-sm ${accent ? "font-medium text-white" : "font-normal text-[#475569]"}`}
      >
        {sub}
      </p>
    </Card>
  );
}
