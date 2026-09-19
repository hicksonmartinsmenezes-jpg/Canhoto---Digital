import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { obterMotoristaAutorizado } from "@/lib/motorista-authorization";
import { getEntregaDoMotoristaAtual } from "@/lib/data/entregas-motorista";
import { RecebimentoEntrega } from "@/components/motorista/RecebimentoEntrega";

export default async function ReceberEntregaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const motoboyId = await obterMotoristaAutorizado();
  if (!motoboyId) redirect("/motorista/login");

  const { id } = await params;
  const entrega = await getEntregaDoMotoristaAtual(id);
  if (!entrega) notFound();

  if (entrega.status !== "pendente" || !entrega.horaSaida) {
    redirect("/motorista");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5">
      <div className="mx-auto max-w-md">
        <Link
          href="/motorista"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500"
        >
          <ChevronLeft className="size-4" />
          Voltar para entregas
        </Link>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Recebimento
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#0A1F44]">
            {entrega.numero}
          </h1>
          <p className="mt-1 text-base font-semibold text-slate-700">
            {entrega.clienteNome}
          </p>
          {entrega.endereco && (
            <p className="mt-1 text-sm text-slate-500">{entrega.endereco}</p>
          )}
        </div>

        <div className="mt-6">
          <RecebimentoEntrega entrega={entrega} />
        </div>
      </div>
    </main>
  );
}
