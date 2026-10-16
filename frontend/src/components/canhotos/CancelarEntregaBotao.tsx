"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { Ban } from "lucide-react";
import { CancelarEntregaDialog } from "@/components/canhotos/CancelarEntregaDialog";

export function CancelarEntregaBotao(props: {
  id: string;
  numero: string;
  cliente: string;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-2 border border-amber-300 bg-white px-4 py-2.5 text-sm font-bold text-amber-700 transition-colors hover:bg-amber-50"
      >
        <Ban className="size-4" />
        Cancelar entrega
      </button>
      <AnimatePresence>
        {aberto && (
          <CancelarEntregaDialog {...props} onClose={() => setAberto(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
