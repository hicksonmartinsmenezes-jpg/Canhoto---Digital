import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Canhoto Digital — Motorista",
    short_name: "Canhoto Digital",
    description: "Aplicativo do motorista para acompanhamento e registro de entregas.",
    start_url: "/motorista",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0A1F44",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
