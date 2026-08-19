import { notFound } from "next/navigation";
import { getEntregaById } from "@/lib/data/entregas";
import { getMotoboys } from "@/lib/data/motoboys";
import { EditarEntregaForm } from "@/components/canhotos/EditarEntregaForm";

export const dynamic = "force-dynamic";

export default async function EditarEntregaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [entrega, motoboys] = await Promise.all([
    getEntregaById(id),
    getMotoboys(),
  ]);

  if (!entrega) notFound();

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight">
          Editar Entrega #{entrega.numero}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Ajuste os dados da entrega ou atualize a situação.
        </p>
      </div>

      <EditarEntregaForm entrega={entrega} motoboys={motoboys} />
    </div>
  );
}
