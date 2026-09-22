import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, MoreVertical } from "lucide-react";
import { EntregaMotoristaDetalheView } from "@/components/motorista/EntregaMotoristaDetalheView";
import { MotoristaAutoRefresh } from "@/components/motorista/MotoristaAutoRefresh";
import { MotoristaLocationTracker } from "@/components/motorista/MotoristaLocationTracker";
import { getEntregaMotoristaDetalhe } from "@/lib/data/motorista-entregas";
import { obterMotoristaAutorizado } from "@/lib/motorista-authorization";

export const dynamic = "force-dynamic";

export default async function MotoristaEntregaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const motoboyId = await obterMotoristaAutorizado();

  if (!motoboyId) redirect("/motorista/login");

  const entrega = await getEntregaMotoristaDetalhe(motoboyId, id);
  if (!entrega) notFound();

  const emRota =
    entrega.status === "pendente" && entrega.horaSaida !== null;

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <MotoristaAutoRefresh />
      <MotoristaLocationTracker ativo={emRota} />

      <header className="bg-[#082B57] text-white">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 py-4">
          <Link
            href="/motorista?view=entregas"
            aria-label="Voltar para entregas"
            className="grid size-10 place-items-center rounded-full bg-white/8 transition hover:bg-white/12"
          >
            <ChevronLeft className="size-5" />
          </Link>

          <div className="min-w-0 flex-1 text-center">
            <p className="text-[15px] font-black">
              {emRota ? "Entrega em andamento" : "Detalhes da entrega"}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-white/65">
              {entrega.numero}
            </p>
          </div>

          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-full text-white/70"
          >
            <MoreVertical className="size-5" />
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 py-5 pb-10">
        <EntregaMotoristaDetalheView entrega={entrega} />
      </main>
    </div>
  );
}
