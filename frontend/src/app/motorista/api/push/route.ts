import { NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dispositivosPush } from "@/lib/db/schema";
import { obterMotoristaAutorizado } from "@/lib/motorista-authorization";
import { pushConfigurado } from "@/lib/push/fcm";

// Guarda (ou remove) o token de notificação do celular do motorista logado.
// O proxy.ts já exige sessão em /motorista/*; aqui a sessão é conferida de novo
// porque o token passa a valer para o motorista da sessão.
export const dynamic = "force-dynamic";

const SEM_CACHE = { "Cache-Control": "no-store" };

// Tokens do FCM: letras, números e : _ - (150–200 caracteres na prática).
const TOKEN_VALIDO = /^[A-Za-z0-9:_-]{20,4096}$/;

async function lerToken(request: Request): Promise<string | null> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return null;
  }
  try {
    const corpo = (await request.json()) as { token?: unknown } | null;
    const token = typeof corpo?.token === "string" ? corpo.token.trim() : "";
    return TOKEN_VALIDO.test(token) ? token : null;
  } catch {
    return null;
  }
}

// Estado do push para este motorista (usado na tela de diagnóstico do app).
export async function GET() {
  const motoboyId = await obterMotoristaAutorizado();
  if (!motoboyId) {
    return NextResponse.json(
      { ok: false, error: "Sessão inválida." },
      { status: 401, headers: SEM_CACHE }
    );
  }

  const db = getDb();
  let registrados = 0;
  if (db) {
    const [linha] = await db
      .select({ total: count() })
      .from(dispositivosPush)
      .where(eq(dispositivosPush.motoboyId, motoboyId));
    registrados = linha?.total ?? 0;
  }

  return NextResponse.json(
    { ok: true, configurado: pushConfigurado(), registrados },
    { headers: SEM_CACHE }
  );
}

export async function POST(request: Request) {
  const motoboyId = await obterMotoristaAutorizado();
  if (!motoboyId) {
    return NextResponse.json(
      { ok: false, error: "Sessão inválida." },
      { status: 401, headers: SEM_CACHE }
    );
  }

  const token = await lerToken(request);
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Token inválido." },
      { status: 400, headers: SEM_CACHE }
    );
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "Banco indisponível." },
      { status: 503, headers: SEM_CACHE }
    );
  }

  // O mesmo celular pode passar de um motorista para outro: o token é único e
  // fica com quem entrou por último.
  await db
    .insert(dispositivosPush)
    .values({ motoboyId, token })
    .onConflictDoUpdate({
      target: dispositivosPush.token,
      set: { motoboyId, atualizadoEm: new Date().toISOString() },
    });

  return NextResponse.json({ ok: true }, { headers: SEM_CACHE });
}

export async function DELETE(request: Request) {
  const motoboyId = await obterMotoristaAutorizado();
  if (!motoboyId) {
    return NextResponse.json(
      { ok: false, error: "Sessão inválida." },
      { status: 401, headers: SEM_CACHE }
    );
  }

  const token = await lerToken(request);
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Token inválido." },
      { status: 400, headers: SEM_CACHE }
    );
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "Banco indisponível." },
      { status: 503, headers: SEM_CACHE }
    );
  }

  await db
    .delete(dispositivosPush)
    .where(
      and(
        eq(dispositivosPush.token, token),
        eq(dispositivosPush.motoboyId, motoboyId)
      )
    );

  return NextResponse.json({ ok: true }, { headers: SEM_CACHE });
}
