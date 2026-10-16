import { getMotoristasEmRota } from "@/lib/data/entregas";
import { obterSessaoOperador, setorIdParaFiltro } from "@/lib/sessao-operador";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessao = await obterSessaoOperador();

  if (!sessao) {
    return Response.json(
      { error: "Não autorizado." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const motoristas = await getMotoristasEmRota(setorIdParaFiltro(sessao));

  return Response.json(
    { motoristas },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    }
  );
}
