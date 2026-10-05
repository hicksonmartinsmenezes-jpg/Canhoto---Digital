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
    // suppressHydrationWarning: dentro do app nativo (Capacitor), o Android
    // injeta variáveis --safe-area-inset-* no style do <html> antes do React
    // hidratar. É esperado e inofensivo; sem isso o dev overlay mostra erro.
    <html lang="pt-BR" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-slate-50 text-[#0A1F44] font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
