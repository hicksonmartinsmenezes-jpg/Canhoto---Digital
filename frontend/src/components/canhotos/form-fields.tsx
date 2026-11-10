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
  // O campo fica DENTRO do <label>: clicar no nome foca o campo e leitores de
  // tela anunciam o nome certo (antes o rótulo não estava ligado ao campo).
  return (
    <label className="block">
      <span className={labelClass}>
        {label}
        {optional && (
          <span className="ml-1 font-medium normal-case text-slate-400">
            (opcional)
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

/**
 * Caixinha "Cliente final": venda para consumidor final não tem NF-e, então o
 * número da nota fica desativado e a entrega não entra no alerta de "sem NF-e".
 */
export function ClienteFinalCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-sm font-medium text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 rounded border-slate-300 text-amber-500 focus:ring-slate-400/30"
      />
      <span>
        Cliente final (sem NF-e)
        <span className="block text-xs font-normal text-slate-400">
          Venda para consumidor final, sem nota fiscal. Não entra no alerta de
          entregas sem NF-e.
        </span>
      </span>
    </label>
  );
}
