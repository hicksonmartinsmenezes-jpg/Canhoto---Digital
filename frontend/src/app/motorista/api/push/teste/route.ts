import { NextResponse } from "next/server";
import { obterMotoristaAutorizado } from "@/lib/motorista-authorization";
import { enviarAvisoDeTeste } from "@/lib/push/avisar-motorista";

// Envia um aviso de teste aos celulares do motorista logado e conta o que
// aconteceu (serve para descobrir em que etapa o push está falhando).
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ ok: false, error: "Formato inválido." }, { status: 415 });
  }

  const motoboyId = await obterMotoristaAutorizado();
  if (!motoboyId) {
    return NextResponse.json({ ok: false, error: "Sessão inválida." }, { status: 401 });
  }

  // Com o app aberto o Android não mostra a notificação; por isso o teste pode
  // ser agendado: o motorista toca no botão, sai do app e o aviso chega depois.
  let atrasoSegundos = 0;
  try {
    const corpo = (await request.json()) as { atrasoSegundos?: unknown } | null;
    if (typeof corpo?.atrasoSegundos === "number" && Number.isFinite(corpo.atrasoSegundos)) {
      atrasoSegundos = Math.min(30, Math.max(0, Math.round(corpo.atrasoSegundos)));
    }
  } catch {
    atrasoSegundos = 0;
  }

  if (atrasoSegundos > 0) {
    setTimeout(() => {
      void enviarAvisoDeTeste(motoboyId).catch(() => {});
    }, atrasoSegundos * 1000);
    return NextResponse.json(
      { ok: true, agendado: true, atrasoSegundos },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const resultado = await enviarAvisoDeTeste(motoboyId);
  return NextResponse.json(
    { ok: true, ...resultado },
    { headers: { "Cache-Control": "no-store" } }
  );
}
