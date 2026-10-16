import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { resolverArquivoComprovante } from "@/lib/comprovantes-storage";
import { getDb } from "@/lib/db";
import { entregaAnexos, entregas } from "@/lib/db/schema";
import {
  obterSessaoOperador,
  sessaoPodeAcessarSetor,
} from "@/lib/sessao-operador";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessao = await obterSessaoOperador();
  if (!sessao) {
    return new Response("Não autorizado.", {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return new Response("Comprovante não encontrado.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
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
      setorId: entregas.setorId,
    })
    .from(entregaAnexos)
    .innerJoin(entregas, eq(entregaAnexos.entregaId, entregas.id))
    .where(eq(entregaAnexos.id, id))
    .limit(1);

  if (
    !anexo ||
    !sessaoPodeAcessarSetor(sessao, anexo.setorId) ||
    (anexo.tipo !== "foto" &&
      anexo.tipo !== "foto_produto" &&
      anexo.tipo !== "comprovante_pix" &&
      anexo.tipo !== "assinatura_cliente" &&
      anexo.tipo !== "xml_nfe" &&
      anexo.tipo !== "xml_cte" &&
      anexo.tipo !== "danfe_pdf")
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
    // XML não abre na tela (pode trazer folha de estilo): sempre baixa.
    const ehXml = arquivo.mime === "application/xml";

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": arquivo.mime,
        "Content-Disposition": ehXml
          ? `attachment; filename="nota-${id.slice(0, 8)}.xml"`
          : "inline",
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
