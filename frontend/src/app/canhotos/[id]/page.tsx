import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  ExternalLink,
  MapPin,
  PenLine,
  ReceiptText,
  SquarePen,
  UserRound,
} from "lucide-react";
import { obterAdminAutenticado } from "@/lib/admin-auth";
import {
  getComprovantesEntrega,
  getEntregaById,
} from "@/lib/data/entregas";
import { formatBRL, formatDateBR } from "@/lib/format";
import {
  FORMA_PAGAMENTO_LABEL,
  STATUS_BADGE_CLASSES,
  STATUS_LABEL,
} from "@/lib/status";

export const dynamic = "force-dynamic";

function formatarDataHora(valor: string): string {
  return new Date(valor).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function EntregaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await obterAdminAutenticado();
  if (!admin) redirect("/login");

  const { id } = await params;
  const [entrega, comprovantes] = await Promise.all([
    getEntregaById(id),
    getComprovantesEntrega(id),
  ]);

  if (!entrega) notFound();

  const fotos = comprovantes.filter((item) => item.tipo === "foto");
  const comprovantesPix = comprovantes.filter(
    (item) => item.tipo === "comprovante_pix"
  );
  const assinaturas = comprovantes.filter(
    (item) => item.tipo === "assinatura_cliente"
  );

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/canhotos"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-[#0A1F44]"
          >
            <ArrowLeft className="size-4" />
            Voltar para Entregas
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Entrega #{entrega.numero}
            </h1>
            <span
              className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[entrega.status]}`}
            >
              {STATUS_LABEL[entrega.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Consulta dos dados e comprovantes registrados para esta entrega.
          </p>
        </div>

        <Link
          href={`/canhotos/${entrega.id}/editar`}
          className="inline-flex items-center gap-2 bg-[#0A1F44] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0A1F44]/90"
        >
          <SquarePen className="size-4" />
          Editar entrega
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <section className="col-span-12 border border-slate-200 bg-white shadow-sm xl:col-span-5">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-[15px] font-bold text-[#0A1F44]">
              Dados da entrega
            </h2>
          </div>

          <dl className="divide-y divide-slate-100 px-6">
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">Data</dt>
              <dd className="font-medium text-slate-800">
                {formatDateBR(entrega.data)}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">Cliente</dt>
              <dd className="font-medium text-slate-800">
                {entrega.clienteNome}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">Telefone</dt>
              <dd className="font-medium text-slate-800">
                {entrega.clienteTelefone || "—"}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">Pedido</dt>
              <dd className="font-medium text-slate-800">
                {entrega.numeroPedido || "—"}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">NF-e</dt>
              <dd className="font-medium text-slate-800">
                {entrega.numeroNfe || "—"}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">Valor</dt>
              <dd className="font-bold text-slate-900">
                {formatBRL(Number(entrega.valorPagamento))}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">Pagamento</dt>
              <dd className="font-medium text-slate-800">
                {FORMA_PAGAMENTO_LABEL[entrega.formaPagamento]}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">Motorista</dt>
              <dd className="flex items-center gap-2 font-medium text-slate-800">
                <UserRound className="size-4 text-slate-400" />
                {entrega.motoboyNome || "Não informado"}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">Endereço</dt>
              <dd className="flex items-start gap-2 font-medium text-slate-800">
                <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <span>{entrega.endereco || "—"}</span>
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">CEP</dt>
              <dd className="font-medium text-slate-800">
                {entrega.cep || "—"}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">Observações</dt>
              <dd className="whitespace-pre-wrap font-medium text-slate-800">
                {entrega.observacoes || "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="col-span-12 border border-slate-200 bg-white shadow-sm xl:col-span-7">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-[15px] font-bold text-[#0A1F44]">
              Comprovante de entrega
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Foto da entrega, assinatura do cliente e comprovante Pix quando informado.
            </p>
          </div>

          {comprovantes.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100 text-slate-400">
                <Camera className="size-5" />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-700">
                Nenhum comprovante registrado
              </p>
              <p className="mt-1 text-sm text-slate-500">
                A foto da entrega e a assinatura aparecerão aqui após a conclusão pelo motorista.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 p-6 md:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Camera className="size-4 text-[#0A1F44]" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Foto da entrega
                  </h3>
                </div>

                {fotos.length > 0 ? (
                  <div className="space-y-4">
                    {fotos.map((foto) => (
                      <div key={foto.id}>
                        <a
                          href={`/api/entregas/anexos/${foto.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden border border-slate-200 bg-slate-50"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/entregas/anexos/${foto.id}`}
                            alt="Foto da entrega"
                            className="h-64 w-full object-contain"
                          />
                        </a>
                        <div className="mt-2 flex items-start justify-between gap-3 text-xs text-slate-500">
                          <div>
                            <p>
                              {foto.capturadoPorMotoboy
                                ? `Enviado por ${foto.capturadoPorMotoboy}`
                                : "Motorista não identificado"}
                            </p>
                            <p>{formatarDataHora(foto.capturadoEm)}</p>
                          </div>
                          <a
                            href={`/api/entregas/anexos/${foto.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-[#0A1F44] hover:underline"
                          >
                            Ampliar
                            <ExternalLink className="size-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">
                    Foto não registrada.
                  </p>
                )}
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <PenLine className="size-4 text-[#0A1F44]" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Assinatura do cliente
                  </h3>
                </div>

                {assinaturas.length > 0 ? (
                  <div className="space-y-4">
                    {assinaturas.map((assinatura) => (
                      <div key={assinatura.id}>
                        <a
                          href={`/api/entregas/anexos/${assinatura.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block border border-slate-200 bg-white"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/entregas/anexos/${assinatura.id}`}
                            alt="Assinatura do cliente"
                            className="h-64 w-full object-contain p-4"
                          />
                        </a>
                        <div className="mt-2 flex items-start justify-between gap-3 text-xs text-slate-500">
                          <div>
                            <p>
                              {assinatura.capturadoPorMotoboy
                                ? `Coletada por ${assinatura.capturadoPorMotoboy}`
                                : "Motorista não identificado"}
                            </p>
                            <p>{formatarDataHora(assinatura.capturadoEm)}</p>
                          </div>
                          <a
                            href={`/api/entregas/anexos/${assinatura.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-[#0A1F44] hover:underline"
                          >
                            Ampliar
                            <ExternalLink className="size-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">
                    Assinatura não registrada.
                  </p>
                )}
              {entrega.formaPagamento === "pix" && (
                <div className="md:col-span-2">
                  <div className="mb-3 flex items-center gap-2">
                    <ReceiptText className="size-4 text-[#0A1F44]" />
                    <h3 className="text-sm font-bold text-slate-800">
                      Comprovante Pix
                    </h3>
                  </div>

                  {comprovantesPix.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {comprovantesPix.map((comprovante) => (
                        <div key={comprovante.id}>
                          <a
                            href={`/api/entregas/anexos/${comprovante.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="block overflow-hidden border border-slate-200 bg-slate-50"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/api/entregas/anexos/${comprovante.id}`}
                              alt="Comprovante de pagamento Pix"
                              className="h-64 w-full object-contain"
                            />
                          </a>
                          <div className="mt-2 flex items-start justify-between gap-3 text-xs text-slate-500">
                            <div>
                              <p>
                                {comprovante.capturadoPorMotoboy
                                  ? `Enviado por ${comprovante.capturadoPorMotoboy}`
                                  : "Motorista não identificado"}
                              </p>
                              <p>{formatarDataHora(comprovante.capturadoEm)}</p>
                            </div>
                            <a
                              href={`/api/entregas/anexos/${comprovante.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-[#0A1F44] hover:underline"
                            >
                              Ampliar
                              <ExternalLink className="size-3.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">
                      Comprovante Pix não registrado.
                    </p>
                  )}
                </div>
              )}

              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
