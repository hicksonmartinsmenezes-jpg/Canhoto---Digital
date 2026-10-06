import { MotoristaOfflineView } from "@/components/motorista/MotoristaOfflineView";

// Página fixa (sem dados do servidor): o service worker guarda uma cópia
// dela na instalação para mostrar quando o app abre sem conexão.
export default function MotoristaOfflinePage() {
  return <MotoristaOfflineView />;
}
