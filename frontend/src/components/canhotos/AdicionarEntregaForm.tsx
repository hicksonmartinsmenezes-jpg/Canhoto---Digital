"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, FileText, Loader2, Paperclip, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  ClienteFinalCheckbox,
  Field,
  inputClass,
} from "@/components/canhotos/form-fields";
import { FORMA_PAGAMENTO_LABEL } from "@/lib/status";
import {
  formatCep,
  maskCepInput,
  maskCurrencyInput,
  maskPhoneInput,
  parseCurrencyInput,
} from "@/lib/format";
import { criarEntrega } from "@/app/canhotos/nova/actions";
import { anexarDocumentosEntrega } from "@/app/canhotos/nova/anexos-actions";
import { abrirPacoteRar } from "@/app/canhotos/nova/pacote-actions";
import { lerDanfePdf } from "@/app/canhotos/nova/danfe-pdf-actions";
import {
  MAX_BYTES_PDF,
  MAX_BYTES_XML,
  MAX_DOCUMENTOS_ENTREGA,
  extensaoDocumento,
  lerDadosNfe,
  tipoDoXmlFiscal,
  type DadosNfe,
} from "@/lib/documento-fiscal";
import {
  PacoteErro,
  bytesDeBase64,
  extrairDocumentosDoZip,
  formatoCompactado,
} from "@/lib/arquivo-compactado";
import type { MotoboyOption } from "@/lib/data/motoboys";
import type { ClienteRecente } from "@/lib/data/entregas";
import type { FormaPagamento } from "@/types/database";

interface FormState {
  data: string;
  clienteNome: string;
  numeroPedido: string;
  numeroNfe: string;
  clienteFinal: boolean;
  valorPagamento: string;
  formaPagamento: FormaPagamento | "";
  motoboyId: string;
  clienteTelefone: string;
  endereco: string;
  cep: string;
  observacoes: string;
}

// Último motorista escolhido neste navegador: os motoristas são fixos, então
// quase sempre é o mesmo da entrega anterior.
const ULTIMO_MOTOBOY_KEY = "canhoto-digital:ultimo-motoboy-id";

function chaveCliente(nome: string) {
  return nome.trim().toLocaleLowerCase("pt-BR");
}

/**
 * Cadastro de entrega em uma tela só (antes eram 3 etapas para ~10 campos).
 * Obrigatórios: cliente, endereço, valor e forma de pagamento. Cliente que já
 * comprou é sugerido pelo nome e preenche telefone/endereço vazios.
 */
export function AdicionarEntregaForm({
  motoboys,
  clientes,
  hoje,
}: {
  motoboys: MotoboyOption[];
  clientes: ClienteRecente[];
  hoje: string;
}) {
  const router = useRouter();
  const listaClientesId = useId();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const clienteRef = useRef<HTMLInputElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [documentos, setDocumentos] = useState<File[]>([]);
  const [docErro, setDocErro] = useState<string | null>(null);
  const [docAviso, setDocAviso] = useState<string | null>(null);
  const [abrindoPacote, setAbrindoPacote] = useState(false);
  // Entrega já gravada, mas com anexo pendente (falhou o envio dos documentos).
  const [entregaCriada, setEntregaCriada] = useState<{
    id: string;
    numero?: number;
  } | null>(null);
  const [form, setForm] = useState<FormState>({
    data: hoje,
    clienteNome: "",
    numeroPedido: "",
    numeroNfe: "",
    clienteFinal: false,
    valorPagamento: "",
    formaPagamento: "",
    motoboyId: "",
    clienteTelefone: "",
    endereco: "",
    cep: "",
    observacoes: "",
  });

  useEffect(() => {
    clienteRef.current?.focus();
    let ultimo: string | null = null;
    try {
      ultimo = window.localStorage.getItem(ULTIMO_MOTOBOY_KEY);
    } catch {
      ultimo = null;
    }
    if (ultimo && motoboys.some((m) => m.id === ultimo)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no cliente
      setForm((f) => ({ ...f, motoboyId: ultimo }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Escolheu um cliente conhecido: completa só o que ainda está vazio.
  function aoMudarCliente(nome: string) {
    set("clienteNome", nome);
    const conhecido = clientes.find((c) => chaveCliente(c.nome) === chaveCliente(nome));
    if (!conhecido) return;
    setForm((f) => ({
      ...f,
      clienteNome: nome,
      clienteTelefone: f.clienteTelefone || (conhecido.telefone ? maskPhoneInput(conhecido.telefone) : ""),
      endereco: f.endereco || conhecido.endereco || "",
      cep: f.cep || (conhecido.cep ? formatCep(conhecido.cep) : ""),
    }));
  }

  // Pacote compactado escolhido: abre e segue com os XML/PDF de dentro, como se
  // o operador tivesse escolhido cada um solto. O .zip é aberto aqui mesmo; o
  // .rar sobe para o servidor, que sabe abrir esse formato (ver pacote-actions).
  // Devolve null quando algo deu errado (a mensagem já foi mostrada).
  async function abrirPacotes(escolhidos: File[]): Promise<File[] | null> {
    const soltos: File[] = [];
    for (const arquivo of escolhidos) {
      const formato = formatoCompactado(arquivo.name);
      if (!formato) {
        soltos.push(arquivo);
        continue;
      }
      if (formato !== "zip" && formato !== "rar") {
        setDocErro(
          `"${arquivo.name}": compacte como .zip ou .rar para anexar o pacote.`
        );
        return null;
      }
      try {
        const dentro =
          formato === "zip"
            ? await extrairDocumentosDoZip(arquivo)
            : await abrirPacoteNoServidor(arquivo);
        if (dentro === null) return null;
        if (dentro.length === 0) {
          setDocErro(`"${arquivo.name}" não tem nenhum XML ou PDF dentro.`);
          return null;
        }
        soltos.push(...dentro);
      } catch (erro) {
        setDocErro(
          erro instanceof PacoteErro
            ? erro.message
            : `Não foi possível abrir "${arquivo.name}".`
        );
        return null;
      }
    }
    return soltos;
  }

  // .rar: só o servidor sabe abrir. Volta a mesma coisa que o .zip devolve aqui
  // — os documentos de dentro, como File. Nada é gravado nessa ida.
  async function abrirPacoteNoServidor(arquivo: File): Promise<File[] | null> {
    const dados = new FormData();
    dados.append("pacote", arquivo);
    setAbrindoPacote(true);
    try {
      const resposta = await abrirPacoteRar(dados);
      if (!resposta.ok) {
        setDocErro(resposta.error);
        return null;
      }
      return resposta.documentos.map(
        (documento) =>
          new File([bytesDeBase64(documento.base64) as BlobPart], documento.nome, {
            type: documento.tipo,
          })
      );
    } catch {
      setDocErro(`Não foi possível abrir "${arquivo.name}" — tente de novo.`);
      return null;
    } finally {
      setAbrindoPacote(false);
    }
  }

  function preencherComDados(dados: DadosNfe) {
    setForm((f) => ({
      ...f,
      clienteNome: dados.clienteNome ?? f.clienteNome,
      endereco: dados.endereco ?? f.endereco,
      cep: dados.cep ? formatCep(dados.cep) : f.cep,
      clienteTelefone: dados.clienteTelefone
        ? maskPhoneInput(dados.clienteTelefone)
        : f.clienteTelefone,
      numeroNfe: dados.numeroNfe ?? f.numeroNfe,
      // Documento com número de NF-e: a venda tem nota, então desmarca.
      clienteFinal: dados.numeroNfe ? false : f.clienteFinal,
      numeroPedido: dados.numeroPedido ?? f.numeroPedido,
      valorPagamento: dados.valor
        ? maskCurrencyInput(String(Math.round(dados.valor * 100)))
        : f.valorPagamento,
      formaPagamento: dados.formaPagamento ?? f.formaPagamento,
    }));
  }

  // Escolheu XML/PDF/ZIP: confere tipo e tamanho; o XML da NF-e preenche os
  // campos (cliente, endereço, telefone, CEP, nota, pedido, valor,
  // pagamento). Sem XML, tenta o mesmo a partir do primeiro PDF (DANFE) —
  // bem menos confiável, por isso só roda quando não há XML no lote.
  async function adicionarDocumentos(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    setDocErro(null);
    setDocAviso(null);

    const soltos = await abrirPacotes(Array.from(lista));
    if (!soltos) return;

    const novos: File[] = [];
    let dadosXml: ReturnType<typeof lerDadosNfe> | null = null;
    let primeiroPdf: File | null = null;

    for (const arquivo of soltos) {
      const ext = extensaoDocumento(arquivo.name);
      if (!ext) {
        setDocErro(
          `"${arquivo.name}": anexe apenas arquivos XML, PDF ou um pacote .zip/.rar.`
        );
        return;
      }
      const maximo = ext === "xml" ? MAX_BYTES_XML : MAX_BYTES_PDF;
      if (arquivo.size > maximo) {
        setDocErro(
          `"${arquivo.name}" é grande demais (máximo ${maximo / 1024 / 1024} MB).`
        );
        return;
      }
      if (ext === "xml") {
        let texto: string;
        try {
          texto = await arquivo.text();
        } catch {
          setDocErro(`Não foi possível ler "${arquivo.name}".`);
          return;
        }
        if (tipoDoXmlFiscal(texto) !== "xml_nfe") {
          setDocErro(`"${arquivo.name}" não parece ser o XML de uma NF-e.`);
          return;
        }
        dadosXml ??= lerDadosNfe(texto);
      } else {
        primeiroPdf ??= arquivo;
      }
      const repetido = [...documentos, ...novos].some(
        (d) => d.name === arquivo.name && d.size === arquivo.size
      );
      if (!repetido) novos.push(arquivo);
    }

    if (documentos.length + novos.length > MAX_DOCUMENTOS_ENTREGA) {
      setDocErro(`Anexe no máximo ${MAX_DOCUMENTOS_ENTREGA} documentos.`);
      return;
    }
    setDocumentos((atuais) => [...atuais, ...novos]);

    if (dadosXml) {
      preencherComDados(dadosXml);
      setDocAviso("Campos preenchidos com os dados do XML.");
      return;
    }

    if (primeiroPdf) {
      const dados = new FormData();
      dados.append("documento", primeiroPdf);
      let resultado: Awaited<ReturnType<typeof lerDanfePdf>>;
      try {
        resultado = await lerDanfePdf(dados);
      } catch {
        return; // PDF já foi anexado; só não preenche os campos.
      }
      if (resultado.ok && resultado.dados) {
        preencherComDados(resultado.dados);
        setDocAviso(
          "Campos preenchidos a partir do PDF (DANFE) — a leitura do PDF é menos confiável que a do XML, confira os dados antes de salvar."
        );
      }
    }
  }

  function removerDocumento(indice: number) {
    setDocumentos((atuais) => atuais.filter((_, i) => i !== indice));
    setDocErro(null);
    setDocAviso(null);
  }

  function validar(): string | null {
    if (!form.clienteNome.trim()) return "Informe o nome do cliente.";
    if (form.endereco.trim().length < 5) {
      return "Informe o endereço de entrega (rua, número e bairro).";
    }
    const valor = parseCurrencyInput(form.valorPagamento);
    if (!valor || valor <= 0) return "Informe um valor de pagamento válido.";
    if (!form.formaPagamento) return "Selecione a forma de pagamento.";
    const cep = form.cep.replace(/\D/g, "");
    if (cep && cep.length !== 8) return "Informe um CEP válido com 8 dígitos.";
    return null;
  }

  function salvar() {
    // Trava contra clique/Enter repetido (duas entregas iguais).
    if (pending) return;
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    startTransition(async () => {
      let criada = entregaCriada;

      if (!criada) {
        let resultado: Awaited<ReturnType<typeof criarEntrega>>;
        try {
          resultado = await criarEntrega({
            data: form.data,
            clienteNome: form.clienteNome,
            numeroPedido: form.numeroPedido,
            numeroNfe: form.numeroNfe,
            clienteFinal: form.clienteFinal,
            valorPagamento: parseCurrencyInput(form.valorPagamento),
            formaPagamento: form.formaPagamento,
            motoboyId: form.motoboyId,
            clienteTelefone: form.clienteTelefone,
            endereco: form.endereco,
            cep: form.cep,
            observacoes: form.observacoes,
          });
        } catch {
          setErro("Sem conexão com o servidor. Confira a rede e tente de novo.");
          return;
        }

        if (!resultado.ok) {
          setErro(resultado.error ?? "Não foi possível salvar a entrega.");
          return;
        }
        criada = { id: resultado.id ?? "", numero: resultado.numero };
        setEntregaCriada(criada);

        if (form.motoboyId) {
          try {
            window.localStorage.setItem(ULTIMO_MOTOBOY_KEY, form.motoboyId);
          } catch {
            // Só uma conveniência.
          }
        }
      }

      if (documentos.length > 0 && criada.id) {
        const dados = new FormData();
        for (const arquivo of documentos) dados.append("documentos", arquivo);
        let anexo: Awaited<ReturnType<typeof anexarDocumentosEntrega>>;
        try {
          anexo = await anexarDocumentosEntrega(criada.id, dados);
        } catch {
          anexo = {
            ok: false,
            error: "Sem conexão com o servidor. Confira a rede e tente de novo.",
          };
        }
        if (!anexo.ok) {
          setErro(
            `A entrega${criada.numero ? ` #${criada.numero}` : ""} foi salva, mas os documentos não foram anexados: ${anexo.error ?? "erro desconhecido."}`
          );
          return;
        }
      }

      router.push(
        criada.numero ? `/canhotos?criada=${criada.numero}` : "/canhotos"
      );
      router.refresh();
    });
  }

  return (
    <form
      className="mx-auto max-w-3xl"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        salvar();
      }}
    >
      <Card className="p-5 sm:p-7">
        <fieldset disabled={Boolean(entregaCriada)} className="contents">
        <h2 className="mb-4 text-[15px] font-bold">Cliente e endereço</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Cliente">
              <input
                ref={clienteRef}
                type="text"
                autoComplete="off"
                list={listaClientesId}
                placeholder="Nome do cliente"
                className={inputClass}
                value={form.clienteNome}
                onChange={(e) => aoMudarCliente(e.target.value)}
                maxLength={120}
              />
            </Field>
            <datalist id={listaClientesId}>
              {clientes.map((c) => (
                <option key={c.nome} value={c.nome}>
                  {c.endereco ?? ""}
                </option>
              ))}
            </datalist>
          </div>
          <div className="sm:col-span-2">
            <Field label="Endereço">
              <input
                type="text"
                autoComplete="off"
                placeholder="Rua, número, bairro"
                className={inputClass}
                value={form.endereco}
                onChange={(e) => set("endereco", e.target.value)}
                maxLength={200}
              />
            </Field>
          </div>
          <Field label="Telefone" optional>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="(79) 99999-9999"
              className={inputClass}
              value={form.clienteTelefone}
              onChange={(e) => set("clienteTelefone", maskPhoneInput(e.target.value))}
            />
          </Field>
          <Field label="CEP" optional>
            <input
              type="text"
              inputMode="numeric"
              placeholder="00000-000"
              maxLength={9}
              className={inputClass}
              value={form.cep}
              onChange={(e) => set("cep", maskCepInput(e.target.value))}
            />
          </Field>
        </div>

        <h2 className="mb-4 mt-8 text-[15px] font-bold">Pagamento e motorista</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Valor do pagamento">
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              className={inputClass}
              value={form.valorPagamento}
              onChange={(e) => set("valorPagamento", maskCurrencyInput(e.target.value))}
            />
          </Field>
          <Field label="Forma de pagamento">
            <select
              className={inputClass}
              value={form.formaPagamento}
              onChange={(e) => set("formaPagamento", e.target.value as FormaPagamento | "")}
            >
              <option value="">Selecione</option>
              {Object.entries(FORMA_PAGAMENTO_LABEL).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Motorista" optional>
            <select
              className={inputClass}
              value={form.motoboyId}
              onChange={(e) => set("motoboyId", e.target.value)}
            >
              <option value="">Definir depois</option>
              {motoboys.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data">
            <input
              type="date"
              className={inputClass}
              value={form.data}
              onChange={(e) => set("data", e.target.value)}
            />
          </Field>
        </div>

        <h2 className="mb-4 mt-8 text-[15px] font-bold">Documento</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <input
              ref={arquivoRef}
              type="file"
              multiple
              accept=".xml,.pdf,.zip,.rar,application/xml,text/xml,application/pdf,application/zip,application/vnd.rar"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                void adicionarDocumentos(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => arquivoRef.current?.click()}
              disabled={abrindoPacote || documentos.length >= MAX_DOCUMENTOS_ENTREGA}
              className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {abrindoPacote ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Paperclip className="size-4" />
              )}
              {abrindoPacote ? "Abrindo pacote..." : "Anexar documento (XML, PDF, ZIP ou RAR)"}
            </button>
            {documentos.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {documentos.map((arquivo, indice) => (
                  <li
                    key={`${arquivo.name}-${arquivo.size}`}
                    className="flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
                  >
                    <FileText className="size-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {arquivo.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removerDocumento(indice)}
                      aria-label={`Remover ${arquivo.name}`}
                      className="grid size-6 shrink-0 place-items-center text-slate-400 hover:text-red-600"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {docAviso && (
              <p className="mt-1.5 text-xs font-semibold text-emerald-700">
                {docAviso}
              </p>
            )}
            {docErro && (
              <p role="alert" className="mt-1.5 text-xs font-semibold text-red-600">
                {docErro}
              </p>
            )}
          </div>
          <Field label="Nº da NF-e" optional>
            <input
              type="text"
              inputMode="numeric"
              className={inputClass}
              value={form.numeroNfe}
              onChange={(e) => set("numeroNfe", e.target.value)}
              maxLength={60}
              disabled={form.clienteFinal}
              placeholder={form.clienteFinal ? "Cliente final: sem NF-e" : undefined}
            />
          </Field>
          <Field label="Nº do pedido" optional>
            <input
              type="text"
              className={inputClass}
              value={form.numeroPedido}
              onChange={(e) => set("numeroPedido", e.target.value)}
              maxLength={60}
            />
          </Field>
          <div className="sm:col-span-2">
            <ClienteFinalCheckbox
              checked={form.clienteFinal}
              onChange={(marcado) =>
                setForm((f) => ({
                  ...f,
                  clienteFinal: marcado,
                  numeroNfe: marcado ? "" : f.numeroNfe,
                }))
              }
            />
          </div>
          <div className="sm:col-span-2">
            <Field label="Observações" optional>
              <textarea
                rows={3}
                className={inputClass}
                placeholder="Ex.: portão azul, ligar antes de chegar"
                value={form.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
                maxLength={500}
              />
            </Field>
          </div>
        </div>

        </fieldset>

        {erro && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {erro}
          </div>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <Link
            href={
              entregaCriada?.numero
                ? `/canhotos?criada=${entregaCriada.numero}`
                : "/canhotos"
            }
            prefetch={false}
            className="text-sm font-bold text-slate-500 hover:text-slate-700"
          >
            {entregaCriada ? "Continuar sem anexar" : "Voltar sem salvar"}
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-amber-400 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="size-4" />
                {entregaCriada ? "Anexar de novo" : "Salvar entrega"}
              </>
            )}
          </button>
        </div>
      </Card>
    </form>
  );
}
