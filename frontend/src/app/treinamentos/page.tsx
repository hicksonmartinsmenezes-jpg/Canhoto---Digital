import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  PlayCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { iniciarTreinamento } from "@/app/treinamentos/actions";
import { obterDonoTreinamento } from "@/lib/treinamento-dono";
import { getTreinamentosProgresso } from "@/lib/data/treinamentos";
import {
  PERFIL_TREINAMENTO_LABEL,
  STATUS_TREINAMENTO_LABEL,
  TREINAMENTOS,
  isPerfilTreinamento,
  type StatusTreinamento,
} from "@/lib/treinamentos";

export const dynamic = "force-dynamic";

interface TreinamentosPageProps {
  searchParams: Promise<{ perfil?: string }>;
}

function statusClasses(status: StatusTreinamento): string {
  if (status === "concluido") {
    return "border-emerald-200 text-emerald-700";
  }
  if (status === "em_andamento") {
    return "border-amber-300 text-amber-700";
  }
  return "border-slate-200 text-slate-500";
}

export default async function TreinamentosPage({
  searchParams,
}: TreinamentosPageProps) {
  const dono = await obterDonoTreinamento();
  if (!dono) redirect("/login");

  const params = await searchParams;
  const perfilAtivo = isPerfilTreinamento(params.perfil)
    ? params.perfil
    : undefined;

  const progressos = await getTreinamentosProgresso(dono);
  const progressoPorSlug = new Map(
    progressos.map((progresso) => [progresso.slug, progresso.status])
  );

  const treinamentos = perfilAtivo
    ? TREINAMENTOS.filter((treinamento) =>
        treinamento.perfis.includes(perfilAtivo)
      )
    : TREINAMENTOS;

  const concluidos = TREINAMENTOS.filter(
    (treinamento) => progressoPorSlug.get(treinamento.slug) === "concluido"
  ).length;
  const emAndamento = TREINAMENTOS.filter(
    (treinamento) => progressoPorSlug.get(treinamento.slug) === "em_andamento"
  ).length;
  const percentual = Math.round((concluidos / TREINAMENTOS.length) * 100);

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-[#0A1F44]">
          Treinamentos
        </h1>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResumoCard label="Treinamentos" value={String(TREINAMENTOS.length)} />
        <ResumoCard label="Em andamento" value={String(emAndamento)} />
        <ResumoCard label="Concluídos" value={String(concluidos)} />
        <ResumoCard label="Progresso" value={`${percentual}%`} />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href="/treinamentos"
          className={`border px-3.5 py-2 text-sm font-semibold transition ${
            !perfilAtivo
              ? "border-[#0A1F44] bg-[#0A1F44] text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-[#0A1F44]/30"
          }`}
        >
          Todos
        </Link>
        {Object.entries(PERFIL_TREINAMENTO_LABEL).map(([perfil, label]) => (
          <Link
            key={perfil}
            href={`/treinamentos?perfil=${perfil}`}
            className={`border px-3.5 py-2 text-sm font-semibold transition ${
              perfilAtivo === perfil
                ? "border-[#0A1F44] bg-[#0A1F44] text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-[#0A1F44]/30"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {treinamentos.map((treinamento) => {
          const status =
            progressoPorSlug.get(treinamento.slug) ?? "nao_iniciado";

          return (
            <Card
              key={treinamento.slug}
              className="flex min-h-[220px] flex-col p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <BookOpenCheck
                  className="size-5 shrink-0 text-[#0A1F44]"
                  strokeWidth={2}
                />
                <span
                  className={`inline-flex border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusClasses(
                    status
                  )}`}
                >
                  {STATUS_TREINAMENTO_LABEL[status]}
                </span>
              </div>

              <h2 className="mt-4 text-[17px] font-bold leading-6 text-slate-900">
                {treinamento.titulo}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5" />
                  {treinamento.duracaoMinutos} min
                </span>
                <span>
                  {treinamento.perfis
                    .map((perfil) => PERFIL_TREINAMENTO_LABEL[perfil])
                    .join(" · ")}
                </span>
              </div>

              <div className="mt-auto pt-5">
                {status === "nao_iniciado" ? (
                  <form action={iniciarTreinamento.bind(null, treinamento.slug)}>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 bg-neutral-600 px-4 py-2.5 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-neutral-500 active:scale-[0.97]"
                    >
                      <PlayCircle className="size-4" />
                      Iniciar treinamento
                    </button>
                  </form>
                ) : (
                  <Link
                    href={`/treinamentos/${treinamento.slug}`}
                    className="inline-flex items-center gap-2 bg-[#0A1F44] px-4 py-2.5 text-sm font-bold text-white transition-[transform,background-color] hover:bg-[#102b5d] active:scale-[0.97]"
                  >
                    {status === "concluido" ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <PlayCircle className="size-4" />
                    )}
                    {status === "concluido" ? "Revisar" : "Continuar"}
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ResumoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tracking-tight text-[#0A1F44]">
        {value}
      </p>
    </Card>
  );
}
