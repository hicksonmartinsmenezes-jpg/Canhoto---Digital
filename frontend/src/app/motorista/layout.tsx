import type { Metadata, Viewport } from "next";
import { MotoristaConexaoAviso } from "@/components/motorista/MotoristaConexaoAviso";
import { MotoristaServiceWorkerRegister } from "@/components/motorista/MotoristaServiceWorkerRegister";

// Metadata só deste segmento (/motorista e sub-rotas) — faz o site virar
// instalável como "app" (Adicionar à tela inicial) só pra área do
// motorista, sem mexer no Admin/Gestor de setor. O manifest tem
// start_url/scope "/motorista", então o PWA instalado abre direto nessa
// área e fica contido nela.
export const metadata: Metadata = {
  title: "Motorista | Canhoto Digital",
  description:
    "App de entregas para motoristas da Rildon Eletropeças: entregas do dia, rota, assinatura e comprovantes.",
  manifest: "/motorista-manifest.webmanifest",
  // iOS Safari não lê o Web App Manifest pra decidir o modo "standalone" —
  // depende desses meta tags apple-specific em vez disso.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Motorista",
  },
  icons: {
    apple: "/icons/motorista-apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A1F44",
  width: "device-width",
  initialScale: 1,
  // Cobre a tela toda em dispositivos com notch/ilha dinâmica quando
  // instalado como app standalone.
  viewportFit: "cover",
};

export default function MotoristaLayout({
  children,
}: LayoutProps<"/motorista">) {
  return (
    <>
      <MotoristaServiceWorkerRegister />
      <MotoristaConexaoAviso />
      {children}
    </>
  );
}
