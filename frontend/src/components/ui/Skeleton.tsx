// Peças reutilizáveis de "skeleton screen" — usadas nos `loading.tsx` de
// cada rota que busca dados no Supabase (ver claude/modelo-de-dados-site.md),
// pra a página nunca aparecer em branco durante o carregamento. O pulso é
// bem sutil (opacidade curta, sem "pulse" chamativo) e é a ÚNICA animação
// em loop do sistema — por isso mesmo com uso comedido, respeitando o
// checklist da skill de Motion Principles (evitar pulsos decorativos
// espalhados pela interface).
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`}
      aria-hidden="true"
    />
  );
}

/** Barra de título de página (h1 + botão de ação) durante o carregamento. */
export function SkeletonPageHeader() {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-44" />
    </div>
  );
}

/** Fileira de StatCards do Dashboard. */
export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-12 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="col-span-12 sm:col-span-6 xl:col-span-3">
          <div className="border border-slate-200 bg-white p-[22px]">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-8 w-20" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Bloco de card com título + corpo — usado pra painéis do Dashboard
 * (mapa, alertas, timeline) enquanto os dados carregam. */
export function SkeletonPanel({ lines = 4 }: { lines?: number }) {
  return (
    <div className="h-full border border-slate-200 bg-white p-6">
      <Skeleton className="h-4 w-36" />
      <div className="mt-5 flex flex-col gap-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Tabela genérica (Entregas, Motoristas) — cabeçalho da Card + linhas. */
export function SkeletonTable({
  columns = 6,
  rows = 6,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="overflow-hidden border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="px-6 py-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="flex items-center gap-6 border-b border-slate-100 py-4 last:border-b-0"
          >
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className={`h-3.5 ${c === 0 ? "w-20" : "flex-1"}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
