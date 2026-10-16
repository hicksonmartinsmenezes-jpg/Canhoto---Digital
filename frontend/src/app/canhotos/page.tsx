import Link from "next/link";
import { CheckCircle2, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CanhotosTable } from "@/components/canhotos/CanhotosTable";
import { FiltrosEntregas } from "@/components/canhotos/FiltrosEntregas";
import { getEntregas, LIMITE_LISTA_ENTREGAS } from "@/lib/data/entregas";
import { getMotoboys } from "@/lib/data/motoboys";
import { isDataIsoValida, isSituacaoEntrega } from "@/lib/status";
import { obterSessaoOperador, setorIdParaFiltro } from "@/lib/sessao-operador";

export const dynamic = "force-dynamic";

const REGEX_UUID = /^[0-9a-f-]{36}$/i;

/** Data de hoje (AAAA-MM-DD) no fuso da loja, não no do servidor. */
function hojeIsoNaLoja(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

interface CanhotosPageProps {
  // Next 16: searchParams chega como Promise em Server Component.
  searchParams: Promise<{
    q?: string;
    situacao?: string;
    motorista?: string;
    de?: string;
    ate?: string;
    criada?: string;
    semNfe?: string;
  }>;
}

export default async function CanhotosPage({ searchParams }: CanhotosPageProps) {
  const params = await searchParams;
  // Tudo que vem da URL é texto solto: só vira filtro se for válido.
  // A lista mostra só o que está em aberto (aguardando saída e em rota).
  // Entregues e canceladas ficam em Relatórios.
  const situacao =
    isSituacaoEntrega(params.situacao) &&
    (params.situacao === "aguardando" || params.situacao === "em_rota")
      ? params.situacao
      : undefined;
  // Vindo do alerta do Dashboard: todas as entregas sem NF-e (não canceladas),
  // de qualquer dia e situação, para o número bater com o do alerta.
  const semNfe = params.semNfe === "1";
  const busca = (params.q ?? "").trim().slice(0, 80);
  const motoboyId = params.motorista && REGEX_UUID.test(params.motorista) ? params.motorista : undefined;
  // Datas: na primeira visita (sem "de"/"ate" na URL) a lista abre no dia de
  // hoje. Se o usuário apagar as datas no filtro, a URL guarda "de=&ate=" e
  // a lista passa a mostrar todos os dias.
  const hoje = hojeIsoNaLoja();
  const escolheuDatas = semNfe || params.de !== undefined || params.ate !== undefined;
  const dataInicio = semNfe
    ? undefined
    : escolheuDatas
    ? isDataIsoValida(params.de)
      ? params.de
      : undefined
    : hoje;
  const dataFim = semNfe
    ? undefined
    : escolheuDatas
    ? isDataIsoValida(params.ate)
      ? params.ate
      : undefined
    : hoje;
  const criada = params.criada && /^\d{1,9}$/.test(params.criada) ? params.criada : null;

  const sessao = await obterSessaoOperador();
  const [entregas, motoboys] = await Promise.all([
    getEntregas(
      {
        situacao: semNfe ? undefined : situacao,
        somenteEmAberto: !semNfe,
        busca,
        motoboyId,
        dataInicio,
        dataFim,
        semNfe,
      },
      setorIdParaFiltro(sessao)
    ),
    getMotoboys(),
  ]);
  // O dia de hoje que a tela já abre selecionado não conta como filtro.
  const temFiltro = Boolean(
    semNfe ||
    situacao ||
    busca ||
    motoboyId ||
    (escolheuDatas && (dataInicio !== hoje || dataFim !== hoje))
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entregas</h1>
        </div>
        <Link
          href="/canhotos/nova"
          prefetch={false}
          className="inline-flex items-center gap-1.5 bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-amber-400 active:scale-[0.97]"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          Adicionar Entrega
        </Link>
      </div>

      {criada && (
        <div
          role="status"
          className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
        >
          <CheckCircle2 className="size-4 shrink-0" />
          Entrega #{criada} cadastrada.
        </div>
      )}

      {semNfe && (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
        >
          <span className="font-semibold">
            Mostrando só entregas sem número de NF-e (de qualquer dia e situação)
          </span>
          <Link
            href="/canhotos"
            className="font-semibold text-sky-700 underline-offset-2 hover:underline"
          >
            Ver lista normal
          </Link>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <FiltrosEntregas
            valores={{
              busca,
              situacao: situacao ?? "",
              motoboyId: motoboyId ?? "",
              dataInicio: dataInicio ?? "",
              dataFim: dataFim ?? "",
            }}
            motoboys={motoboys}
            temFiltro={temFiltro}
          />
        </div>

        <CanhotosTable
          entregas={entregas}
          filtrada={temFiltro}
          podeExcluir={sessao?.tipo === "admin"}
        />

        {entregas.length >= LIMITE_LISTA_ENTREGAS && (
          <p className="border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
            Mostrando as {LIMITE_LISTA_ENTREGAS} entregas mais recentes. Use a
            busca ou as datas para encontrar as mais antigas.
          </p>
        )}
      </Card>
    </div>
  );
}
