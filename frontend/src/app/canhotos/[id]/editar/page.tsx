import { notFound, redirect } from "next/navigation";
import { getEntregaById } from "@/lib/data/entregas";
import { getMotoboys } from "@/lib/data/motoboys";
import {
  obterSessaoOperador,
  sessaoPodeAcessarSetor,
} from "@/lib/sessao-operador";
import { EditarEntregaForm } from "@/components/canhotos/EditarEntregaForm";

export const dynamic = "force-dynamic";

export default async function EditarEntregaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessao = await obterSessaoOperador();
  if (!sessao) redirect("/login");

  const { id } = await params;
  const [entrega, motoboys] = await Promise.all([
    getEntregaById(id),
    getMotoboys(),
  ]);

  if (!entrega || !sessaoPodeAcessarSetor(sessao, entrega.setorId)) notFound();

  // Entrega concluída: só o Admin corrige (a action também bloqueia).
  if (sessao.tipo !== "admin" && entrega.status === "entregue") {
    redirect(`/canhotos/${entrega.id}`);
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight">
          Editar Entrega #{entrega.numero}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Ajuste os dados da entrega ou atualize a situação.
          {entrega.status === "entregue" &&
            " Entrega concluída: alterações de valor, pagamento, cliente, motorista ou data ficam registradas no histórico."}
        </p>
      </div>

      <EditarEntregaForm entrega={entrega} motoboys={motoboys} />
    </div>
  );
}
