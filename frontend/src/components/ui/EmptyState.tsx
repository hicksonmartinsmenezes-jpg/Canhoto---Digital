import type { ReactNode } from "react";
import Link from "next/link";
import { Plus, type LucideIcon } from "lucide-react";

interface EmptyStateAction {
  label: string;
  /** Link (navega pra outra rota) — ex. "Nova Entrega" leva pro wizard. */
  href?: string;
  /** Ou uma ação local (ex. abrir um modal já na própria tela). */
  onClick?: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  /** Versão mais enxuta — usada em cards menores (ex. mini-tabela do
   * Dashboard), onde o espaço é mais disputado que numa listagem cheia. */
  compact?: boolean;
}

// Estado vazio padrão do sistema — usado nas listagens (Entregas,
// Motoristas) e no mini-resumo do Dashboard. Antes cada tela tinha só uma
// frase cinza-clara sem nenhuma orientação; agora um ícone + (quando faz
// sentido) um atalho direto pra primeira ação, no espírito de onboarding.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  const actionButtonClass =
    "mt-1 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white transition-[transform,background-color] duration-150 hover:bg-amber-400 active:scale-[0.97]";

  let actionNode: ReactNode = null;
  if (action) {
    actionNode = action.href ? (
      <Link href={action.href} className={actionButtonClass}>
        <Plus className="size-3.5" strokeWidth={2.5} />
        {action.label}
      </Link>
    ) : (
      <button type="button" onClick={action.onClick} className={actionButtonClass}>
        <Plus className="size-3.5" strokeWidth={2.5} />
        {action.label}
      </button>
    );
  }

  return (
    <div
      className={`flex flex-col items-center gap-3 px-6 text-center ${compact ? "py-10" : "py-14"}`}
    >
      <span
        className={`grid place-items-center rounded-full bg-slate-100 text-slate-400 ${compact ? "size-10" : "size-12"}`}
      >
        <Icon className={compact ? "size-5" : "size-6"} strokeWidth={1.75} />
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-600">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        )}
      </div>
      {actionNode}
    </div>
  );
}
