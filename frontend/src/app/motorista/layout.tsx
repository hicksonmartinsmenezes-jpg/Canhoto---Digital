import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Canhoto Digital — Motorista",
  description: "Aplicativo do motorista para acompanhamento e registro de entregas.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A1F44",
};

export default function MotoristaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="min-h-dvh bg-slate-50">{children}</div>;
}
