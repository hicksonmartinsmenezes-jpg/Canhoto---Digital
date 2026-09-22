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
  pendentes = 0,
}: {
  ativo: MotoristaView;
  pendentes?: number;
}) {
  return (
    <nav
      aria-label="Navegação do motorista"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 shadow-[0_-8px_28px_rgba(15,23,42,0.06)] backdrop-blur"
    >
      <div
        className="mx-auto grid max-w-xl grid-cols-4 px-3 pt-1.5"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      >
        {ITENS.map((item) => {
          const Icon = item.icon;
          const selecionado = ativo === item.id;
          const mostrarBadge = item.id === "entregas" && pendentes > 0;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={selecionado ? "page" : undefined}
              className={`relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-extrabold transition ${
                selecionado
                  ? "text-[#1768D8]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-[#0A1F44]"
              }`}
            >
              <span className="relative">
                <Icon className="size-5 stroke-[2.2]" />
                {mostrarBadge && (
                  <span className="absolute -right-3 -top-2 grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-5 text-white">
                    {pendentes > 9 ? "9+" : pendentes}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
              {selecionado && (
                <span className="absolute bottom-0 h-1 w-10 rounded-full bg-[#1768D8]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
