import { ChevronLeft } from "lucide-react";

// Aparece na hora ao abrir uma entrega, enquanto o servidor monta a tela
// (pelo túnel isso leva um tempo) — evita a sensação de "toquei e nada
// aconteceu".
export default function CarregandoEntrega() {
  return (
    <div className="min-h-screen bg-[#F5F7FB]" aria-busy="true">
      <header className="bg-[#082B57] text-white">
        <div className="flex w-full items-center gap-3 px-4 py-4">
          <span className="grid size-10 place-items-center rounded-full bg-white/8">
            <ChevronLeft className="size-5" />
          </span>
          <div className="flex-1 text-center">
            <p className="text-[15px] font-black">Abrindo entrega…</p>
          </div>
          <span className="size-10" />
        </div>
      </header>

      <main className="w-full space-y-3 px-4 py-4">
        <div className="h-24 animate-pulse bg-white" />
        <div className="h-40 animate-pulse bg-white" />
        <div className="h-24 animate-pulse bg-white" />
      </main>
    </div>
  );
}
