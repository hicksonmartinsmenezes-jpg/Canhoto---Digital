import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Canhoto Digital | Rildon Eletropeças",
  description:
    "Portal Web Admin do Canhoto Digital — controle de entregas ao cliente: valor, forma de pagamento, motorista responsável e status.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-[#0A1F44] font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
