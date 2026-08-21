import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";
import { NotificationsBell } from "./NotificationsBell";
import type { Alerta } from "@/lib/data/entregas";

interface PageHeaderProps {
  title: string;
  beta?: boolean;
  action?: ReactNode;
  // Alertas reais pro sininho de notificações (Issue #21) — quem renderiza
  // o PageHeader já buscou os dados (ex. getAlertas() no Dashboard), então
  // só repassa em vez do NotificationsBell buscar/mockar por conta própria.
  alertas: Alerta[];
}

/**
 * Barra de título no topo da página, inspirada na referência trazida pelo
 * Hickson (título com badge "BETA" à esquerda e uma ação em destaque à
 * direita, ex. "Treinamento").
 */
export function PageHeader({ title, beta, action, alertas }: PageHeaderProps) {
  return (
    <div className="-mx-6 -mt-6 mb-6 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/60 px-6 py-4 lg:-mx-8 lg:-mt-8 lg:px-8">
      <div className="flex items-center gap-3 border-l-4 border-[#0A1F44] pl-3">
        <h1 className="text-lg font-bold tracking-tight text-[#0A1F44]">
          {title}
        </h1>
        {beta && (
          <span className="rounded-md bg-[#0A1F44] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
            BETA
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <NotificationsBell alertas={alertas} />
        {action ?? <TreinamentoButton />}
      </div>
    </div>
  );
}

function TreinamentoButton() {
  return (
    <button className="inline-flex items-center gap-2 bg-[#0A1F44] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0A1F44]/90">
      <GraduationCap className="size-4" />
      Treinamento
    </button>
  );
}
