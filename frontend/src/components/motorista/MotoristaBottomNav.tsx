import Link from "next/link";
import { Clock3, Home, Package, UserRound } from "lucide-react";

export type MotoristaView = "inicio" | "entregas" | "historico" | "perfil";

const ITENS: Array<{
  id: MotoristaView;
  label: string;
  href: string;
  icon: typeof Home;
}> = [
  { id: "inicio", label: "Início", href: "/motorista", icon: Home },
  {
    id: "entregas",
    label: "Entregas",
    href: "/motorista?view=entregas",
    icon: Package,
  },
  {
    id: "historico",
    label: "Histórico",
    href: "/motorista?view=historico",
    icon: Clock3,
  },
  {
    id: "perfil",
    label: "Perfil",
    href: "/motorista?view=perfil",
    icon: UserRound,
  },
];

export function MotoristaBottomNav({
  ativo,
}: {
  ativo: MotoristaView;
}) {
  return (
    <nav
      aria-label="Navegação do motorista"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 shadow-[0_-10px_30px_rgba(15,23,42,0.06)] backdrop-blur"
    >
      <div
        className="mx-auto grid max-w-xl grid-cols-4 px-2 pt-2"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      >
        {ITENS.map((item) => {
          const Icon = item.icon;
          const selecionado = ativo === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={selecionado ? "page" : undefined}
              className={`relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-bold transition ${
                selecionado
                  ? "text-emerald-600"
                  : "text-slate-500 hover:bg-slate-50 hover:text-[#0A1F44]"
              }`}
            >
              <Icon className="size-5 stroke-2" />
              <span>{item.label}</span>
              {selecionado && (
                <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-emerald-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
