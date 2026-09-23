import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { obterAdminAutenticado } from "@/lib/admin-auth";
import { resolverArquivoComprovante } from "@/lib/comprovantes-storage";
import { getDb } from "@/lib/db";
import { entregaAnexos } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await obterAdminAutenticado();
  if (!admin) {
    return new Response("Não autorizado.", {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const { id } = await params;
  const db = getDb();

  if (!db) {
    return new Response("Serviço indisponível.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const [anexo] = await db
    .select({
      tipo: entregaAnexos.tipo,
      arquivoUrl: entregaAnexos.arquivoUrl,
    })
    .from(entregaAnexos)
    .where(eq(entregaAnexos.id, id))
    .limit(1);

  if (
    !anexo ||
    (anexo.tipo !== "foto" &&
      anexo.tipo !== "comprovante_pix" &&
      anexo.tipo !== "assinatura_cliente")
  ) {
    return new Response("Comprovante não encontrado.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const arquivo = resolverArquivoComprovante(anexo.arquivoUrl);
  if (!arquivo) {
    return new Response("Comprovante inválido.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const bytes = await readFile(arquivo.caminho);

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": arquivo.mime,
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Arquivo não encontrado.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
