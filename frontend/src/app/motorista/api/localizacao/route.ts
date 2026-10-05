import { NextResponse } from "next/server";
import { atualizarLocalizacaoMotorista } from "@/app/motorista/actions";

// Endpoint de localização usado pelo app nativo (Capacitor). Com o app em
// segundo plano o Android limita as requisições feitas pela WebView, então o
// rastreador chama este endpoint pelo plugin HTTP nativo. A autenticação é a
// mesma da Server Action: cookie de sessão do motorista (o proxy.ts já exige
// sessão em /motorista/*) e a ação ainda confere que existe entrega em rota.
export const dynamic = "force-dynamic";

function numeroOuNulo(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

export async function POST(request: Request) {
  // Exigir JSON impede envio por formulário de outro site (CSRF simples).
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json(
      { ok: false, error: "Formato inválido." },
      { status: 415 }
    );
  }

  let corpo: Record<string, unknown> | null = null;
  try {
    corpo = (await request.json()) as Record<string, unknown> | null;
  } catch {
    corpo = null;
  }

  const latitude = numeroOuNulo(corpo?.latitude);
  const longitude = numeroOuNulo(corpo?.longitude);
  if (latitude === null || longitude === null) {
    return NextResponse.json(
      { ok: false, error: "Localização inválida." },
      { status: 400 }
    );
  }

  const resultado = await atualizarLocalizacaoMotorista({
    latitude,
    longitude,
    precisaoMetros: numeroOuNulo(corpo?.precisaoMetros),
  });

  return NextResponse.json(resultado, {
    headers: { "Cache-Control": "no-store" },
  });
}
