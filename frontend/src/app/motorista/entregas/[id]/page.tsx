import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { EntregaMotoristaDetalheView } from "@/components/motorista/EntregaMotoristaDetalheView";
import { MotoristaLocationTracker } from "@/components/motorista/MotoristaLocationTracker";
import { MotoristaWakeLock } from "@/components/motorista/MotoristaWakeLock";
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
      <MotoristaLocationTracker ativo={emRota} />
      <MotoristaWakeLock ativo={emRota} />

      <header className="bg-[#082B57] text-white">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-4">
          <Link
            href="/motorista"
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

          {/* Espaço do mesmo tamanho do botão voltar, só para centralizar o
              título (antes havia um "⋮" que parecia botão e não fazia nada). */}
          <span aria-hidden="true" className="size-10" />
        </div>
      </header>

      <main className="w-full px-4 py-4 pb-10">
        <EntregaMotoristaDetalheView entrega={entrega} />
      </main>
    </div>
  );
}
