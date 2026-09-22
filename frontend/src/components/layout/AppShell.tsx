"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const areaMotorista = pathname.startsWith("/motorista");

  if (areaMotorista) {
    return (
      <main className="min-h-dvh w-full overflow-x-hidden">
        {children}
      </main>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="min-h-full p-6 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] peer-hover:translate-x-48 md:ml-16 lg:p-8">
        {children}
      </main>
    </>
  );
}
