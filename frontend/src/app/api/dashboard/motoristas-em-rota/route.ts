import { obterAdminAutenticado } from "@/lib/admin-auth";
import { getMotoristasEmRota } from "@/lib/data/entregas";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await obterAdminAutenticado();

  if (!admin) {
    return Response.json(
      { error: "Não autorizado." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const motoristas = await getMotoristasEmRota();

  return Response.json(
    { motoristas },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    }
  );
}
