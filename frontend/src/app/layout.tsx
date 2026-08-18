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
      <body className="flex min-h-full bg-zinc-50 text-zinc-900 font-sans">
        <Sidebar />
        <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
      </body>
    </html>
  );
}
