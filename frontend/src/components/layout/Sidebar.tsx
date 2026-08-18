import Link from "next/link";

// Estrutura de navegação do Portal Web Admin — Canhoto Interno.
// Escopo confirmado: só o fluxo interno (sem módulo de Entregas externas).
const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/canhotos", label: "Canhotos" },
  { href: "/colaboradores", label: "Colaboradores" },
  { href: "/setores", label: "Setores" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/configuracoes/usuarios", label: "Usuários" },
  { href: "/configuracoes/tipos-documento", label: "Tipos de Documento" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-300 md:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        <span className="grid size-8 place-items-center rounded-lg bg-amber-500 font-bold text-zinc-950">
          C
        </span>
        <span className="text-lg font-bold tracking-tight text-white">
          Canhoto<span className="text-amber-500">Interno</span>
        </span>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-3 py-2 text-sm text-zinc-300/80 transition-colors hover:bg-zinc-900 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
