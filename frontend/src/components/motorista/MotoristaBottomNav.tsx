"use client";

import Link from "next/link";
import { Clock3, Package, UserRound } from "lucide-react";

export type MotoristaView = "entregas" | "historico" | "perfil";

const ITENS: Array<{
  id: MotoristaView;
  label: string;
  href: string;
  icon: typeof Package;
}> = [
  {
    id: "entregas",
    label: "Entregas",
    href: "/motorista",
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

// Com `onSelecionar` as abas trocam na hora no próprio aparelho (sem ir ao
// servidor); sem ele continuam sendo links normais.
export function MotoristaBottomNav({
  ativo,
  pendentes = 0,
  onSelecionar,
}: {
  ativo: MotoristaView;
  pendentes?: number;
  onSelecionar?: (view: MotoristaView) => void;
}) {
  return (
    <nav
      aria-label="Navegação do motorista"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 shadow-[0_-8px_28px_rgba(15,23,42,0.06)] backdrop-blur"
    >
      <div
        className="grid w-full grid-cols-3 px-1 pt-1"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      >
        {ITENS.map((item) => {
          const Icon = item.icon;
          const selecionado = ativo === item.id;
          const mostrarBadge = item.id === "entregas" && pendentes > 0;
          const classe = `relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-extrabold transition ${
            selecionado
              ? "text-[#1768D8]"
              : "text-[#59708E] hover:bg-slate-50 hover:text-[#0A1F44]"
          }`;
          const conteudo = (
            <>
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
                <span className="absolute bottom-0 h-1 w-12 rounded-full bg-[#1768D8]" />
              )}
            </>
          );

          if (onSelecionar) {
            // Link comum (<a>) de propósito: com internet lenta o JavaScript
            // demora a carregar, e um <button> ficaria "morto" até lá. Assim
            // o toque já funciona antes disso (abre a aba pelo servidor);
            // depois que o JS carrega, o clique é interceptado e a troca é
            // instantânea, sem recarregar.
            return (
              <a
                key={item.id}
                href={item.href}
                aria-current={selecionado ? "page" : undefined}
                onClick={(evento) => {
                  if (
                    evento.metaKey ||
                    evento.ctrlKey ||
                    evento.shiftKey ||
                    evento.button !== 0
                  ) {
                    return;
                  }
                  evento.preventDefault();
                  onSelecionar(item.id);
                }}
                className={classe}
              >
                {conteudo}
              </a>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={selecionado ? "page" : undefined}
              className={classe}
            >
              {conteudo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
