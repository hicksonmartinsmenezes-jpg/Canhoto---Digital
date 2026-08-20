"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, CalendarClock, FileClock, FileWarning } from "lucide-react";
import { ALERTAS, type Alerta } from "@/lib/dashboard-mock";

// Reaproveita os mesmos alertas do card "Alertas e pendências" do Dashboard
// (`lib/dashboard-mock.ts`) — mantém os números consistentes em vez de criar
// uma segunda fonte de dados só pro sininho do cabeçalho.
const TOM_STYLES: Record<
  Alerta["tom"],
  { icon: typeof FileWarning; iconClass: string }
> = {
  critico: { icon: FileWarning, iconClass: "bg-red-600/10 text-red-600" },
  atencao: { icon: FileClock, iconClass: "bg-amber-500/10 text-amber-500" },
  info: { icon: CalendarClock, iconClass: "bg-[#0A1F44]/10 text-[#0A1F44]" },
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
        className="relative grid size-10 place-items-center border border-slate-200 bg-white text-[#0A1F44] transition-[transform,background-color] duration-150 hover:bg-slate-50 active:scale-95"
      >
        <Bell className="size-[18px]" strokeWidth={2} />
        {ALERTAS.length > 0 && (
          <span className="absolute -right-1 -top-1 grid size-[18px] place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white">
            {ALERTAS.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Overlay invisível só pra capturar o clique-fora e fechar o dropdown. */}
            <button
              type="button"
              aria-label="Fechar notificações"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -3 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              style={{ transformOrigin: "top right" }}
              className="absolute right-0 z-50 mt-2 w-80 border border-slate-200 bg-white shadow-lg"
            >
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-bold text-[#0A1F44]">
                  Notificações
                </h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {ALERTAS.map((a) => {
                  const style = TOM_STYLES[a.tom];
                  const Icon = style.icon;
                  return (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 transition-colors last:border-0 hover:bg-slate-50"
                    >
                      <span
                        className={`grid size-9 shrink-0 place-items-center rounded-lg ${style.iconClass}`}
                      >
                        <Icon className="size-4" strokeWidth={2} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#0A1F44]">
                          {a.titulo}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                          {a.descricao}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
