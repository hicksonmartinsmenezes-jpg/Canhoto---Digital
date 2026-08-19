import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Canhoto Interno | Rildon Eletropeças",
  description:
    "Portal Web Admin do Canhoto Interno — controle de recebimento de documentos por setor, responsável e status.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-[#0A1F44] font-sans">
        <Sidebar />
        <main className="min-h-full p-6 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] peer-hover:translate-x-48 md:ml-16 lg:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
