import { ArrowRight } from "lucide-react";

/**
 * Período com duas datas num único campo ("De → Até"). Serve tanto a
 * formulários de servidor (sem onChange) quanto a client components.
 */
export function CampoPeriodo({
  nomeInicio,
  nomeFim,
  valorInicio,
  valorFim,
  onChange,
  className = "",
}: {
  nomeInicio: string;
  nomeFim: string;
  valorInicio?: string;
  valorFim?: string;
  onChange?: () => void;
  /** Estilo do rótulo "Período" (muda um pouco de tela para tela). */
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Período"
      className={`flex flex-col ${className}`}
    >
      Período
      <div className="flex items-center rounded-xl border border-slate-200 bg-white transition-colors focus-within:border-slate-400 hover:border-slate-300">
        <input
          type="date"
          name={nomeInicio}
          aria-label="De"
          defaultValue={valorInicio}
          onChange={onChange}
          className="campo-data"
        />
        <ArrowRight
          aria-hidden
          className="size-3.5 shrink-0 text-slate-300"
          strokeWidth={2.5}
        />
        <input
          type="date"
          name={nomeFim}
          aria-label="Até"
          defaultValue={valorFim}
          onChange={onChange}
          className="campo-data"
        />
      </div>
    </div>
  );
}
