// Estilos e peças pequenas compartilhadas entre os formulários de Entrega
// (wizard "Adicionar Entrega" e a tela "Editar Entrega") — mantém os dois
// visualmente idênticos sem duplicar as classes Tailwind.

export const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-400/15";
const labelClass =
  "mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500";

export function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {optional && (
          <span className="ml-1 font-medium normal-case text-slate-400">
            (opcional)
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
