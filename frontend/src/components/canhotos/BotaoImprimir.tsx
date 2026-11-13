"use client";

import { Printer } from "lucide-react";

export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 bg-[#0A1F44] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0A1F44]/90"
    >
      <Printer className="size-4" />
      Imprimir / salvar em PDF
    </button>
  );
}
