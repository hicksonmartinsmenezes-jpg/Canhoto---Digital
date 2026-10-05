"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import type { PapelPortal } from "@/lib/papel-portal";

export function AppShell({
  children,
  papel,
}: {
  children: ReactNode;
  papel: PapelPortal;
}) {
  const pathname = usePathname();
  const areaMotorista = pathname.startsWith("/motorista");
  // Telas de login (Admin e Gestor de setor) não devem exibir a barra
  // lateral: antes da autenticação não há sessão, e o menu não pode ficar
  // visível/clicável nessas rotas (AGENTS.md — falhar fechado em auth).
  const telaDeLogin =
    pathname === "/login" || pathname.startsWith("/colaborador/login");

  if (areaMotorista || telaDeLogin) {
    return (
      <main className="min-h-dvh w-full overflow-x-hidden">
        {children}
      </main>
    );
  }

  return (
    <>
      <Sidebar papel={papel} />
      <main className="min-h-full p-6 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] peer-hover:translate-x-48 md:ml-16 lg:p-8">
        {children}
      </main>
    </>
  );
}
