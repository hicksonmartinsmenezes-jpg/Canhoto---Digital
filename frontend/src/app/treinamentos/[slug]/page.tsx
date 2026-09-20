import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  PlayCircle,
  Video,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  concluirTreinamento,
  iniciarTreinamento,
} from "@/app/treinamentos/actions";
import { obterAdminAutenticado } from "@/lib/admin-auth";
import { getTreinamentoProgresso } from "@/lib/data/treinamentos";
import {
  PERFIL_TREINAMENTO_LABEL,
  STATUS_TREINAMENTO_LABEL,
  obterTreinamentoPorSlug,
  type StatusTreinamento,
} from "@/lib/treinamentos";

export const dynamic = "force-dynamic";

interface TreinamentoDetalhePageProps {
  params: Promise<{ slug: string }>;
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

export default async function TreinamentoDetalhePage({
  params,
}: TreinamentoDetalhePageProps) {
  const admin = await obterAdminAutenticado();
  if (!admin) redirect("/login");

  const { slug } = await params;
  const treinamento = obterTreinamentoPorSlug(slug);
  if (!treinamento) notFound();

  const progresso = await getTreinamentoProgresso(
    admin.usuarioAdminId,
    treinamento.slug
  );
  const status: StatusTreinamento = progresso?.status ?? "nao_iniciado";

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/treinamentos"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#0A1F44]"
      >
        <ArrowLeft className="size-4" />
        Treinamentos
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold tracking-tight text-[#0A1F44]">
            {treinamento.titulo}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-4" />
              {treinamento.duracaoMinutos} min
            </span>
            <span>
              {treinamento.perfis
                .map((perfil) => PERFIL_TREINAMENTO_LABEL[perfil])
                .join(" · ")}
            </span>
          </div>
        </div>

        <span
          className={`inline-flex border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${statusClasses(
            status
          )}`}
        >
          {STATUS_TREINAMENTO_LABEL[status]}
        </span>
      </div>

      <Card className="mb-5 p-6">
        <h2 className="text-[15px] font-bold text-[#0A1F44]">Objetivo</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          {treinamento.objetivo}
        </p>
      </Card>

      <Card className="mb-5 overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-[15px] font-bold text-[#0A1F44]">
            Passo a passo
          </h2>
        </div>

        <ol className="divide-y divide-slate-100">
          {treinamento.passos.map((passo, index) => (
            <li key={passo} className="flex gap-4 px-6 py-4">
              <span className="w-6 shrink-0 text-sm font-black tabular-nums text-[#0A1F44]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="text-sm leading-6 text-slate-600">{passo}</p>
            </li>
          ))}
        </ol>
      </Card>

      {treinamento.pontosImportantes &&
        treinamento.pontosImportantes.length > 0 && (
          <Card className="mb-5 p-6">
            <h2 className="text-[15px] font-bold text-[#0A1F44]">
              Pontos importantes
            </h2>
            <ul className="mt-4 space-y-3">
              {treinamento.pontosImportantes.map((ponto) => (
                <li
                  key={ponto}
                  className="flex gap-3 text-sm leading-6 text-slate-600"
                >
                  <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />
                  <span>{ponto}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

      {treinamento.videoUrl && (
        <Card className="mb-5 p-6">
          <div className="flex items-center gap-2">
            <Video className="size-5 text-[#0A1F44]" />
            <h2 className="text-[15px] font-bold text-[#0A1F44]">Vídeo</h2>
          </div>
          <a
            href={treinamento.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 bg-[#0A1F44] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#102b5d]"
          >
            Assistir vídeo
            <ExternalLink className="size-4" />
          </a>
        </Card>
      )}

      {treinamento.materiais && treinamento.materiais.length > 0 && (
        <Card className="mb-5 p-6">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-[#0A1F44]" />
            <h2 className="text-[15px] font-bold text-[#0A1F44]">
              Materiais
            </h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {treinamento.materiais.map((material) => (
              <a
                key={material.href}
                href={material.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 hover:border-[#0A1F44]/30 hover:text-[#0A1F44]"
              >
                {material.titulo}
                <ExternalLink className="size-3.5" />
              </a>
            ))}
          </div>
        </Card>
      )}

      <div className="flex justify-end pb-4">
        {status === "nao_iniciado" ? (
          <form action={iniciarTreinamento.bind(null, treinamento.slug)}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-400"
            >
              <PlayCircle className="size-4" />
              Iniciar treinamento
            </button>
          </form>
        ) : status === "em_andamento" ? (
          <form action={concluirTreinamento.bind(null, treinamento.slug)}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-[#0A1F44] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102b5d]"
            >
              <CheckCircle2 className="size-4" />
              Marcar como concluído
            </button>
          </form>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="size-4" />
            Treinamento concluído
          </span>
        )}
      </div>
    </div>
  );
}
