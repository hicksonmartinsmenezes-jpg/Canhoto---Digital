"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/canhotos/form-fields";
import { FORMA_PAGAMENTO_LABEL } from "@/lib/status";
import { maskCurrencyInput, maskPhoneInput, parseCurrencyInput } from "@/lib/format";
import { criarEntrega } from "@/app/canhotos/nova/actions";
import type { MotoboyOption } from "@/lib/data/motoboys";
import type { FormaPagamento } from "@/types/database";

interface AdicionarEntregaWizardProps {
  motoboys: MotoboyOption[];
  hoje: string;
}

interface FormState {
  data: string;
  clienteNome: string;
  numeroPedido: string;
  numeroNfe: string;
  valorPagamento: string;
  formaPagamento: FormaPagamento | "";
  motoboyId: string;
  clienteTelefone: string;
  endereco: string;
  observacoes: string;
}

const ETAPAS = [
  { numero: 1, titulo: "Documento" },
  { numero: 2, titulo: "Entrega" },
  { numero: 3, titulo: "Revisão" },
] as const;

// Variantes da transição de etapa: "custom" (a direção, 1 ou -1) chega via
// a prop `custom` do <motion.div>, então a mesma definição serve pras três
// etapas — cada uma entra do lado de quem foi (direita ao avançar,
// esquerda ao voltar) e sai discretamente pro lado oposto.
const stepVariants = {
  enter: (dir: 1 | -1) => ({ opacity: 0, x: dir * 24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: 1 | -1) => ({ opacity: 0, x: dir * -16 }),
};

// Chave usada no localStorage do navegador para lembrar o último motoboy
// selecionado — economiza um clique/seleção quando o mesmo motoboy sai com
// várias entregas seguidas (caso comum aqui, já que os motoboys são fixos).
const ULTIMO_MOTOBOY_KEY = "canhoto-digital:ultimo-motoboy-id";

function Resumo({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className={`mt-0.5 text-sm ${value ? "font-semibold" : "text-slate-300"}`}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

export function AdicionarEntregaWizard({
  motoboys,
  hoje,
}: AdicionarEntregaWizardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  // Direção da transição entre etapas — 1 = avançando (conteúdo novo entra
  // pela direita), -1 = voltando (entra pela esquerda). Guia a animação de
  // slide do conteúdo do card abaixo.
  const [direcao, setDirecao] = useState<1 | -1>(1);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    data: hoje,
    clienteNome: "",
    numeroPedido: "",
    numeroNfe: "",
    valorPagamento: "",
    formaPagamento: "",
    motoboyId: "",
    clienteTelefone: "",
    endereco: "",
    observacoes: "",
  });

  // Pré-seleciona o último motoboy usado neste navegador — os motoboys
  // daqui são fixos (terceirizados de longa data), então na maioria das
  // vezes é o mesmo de antes. Feito no efeito (não num inicializador do
  // useState) de propósito: `localStorage` só existe no cliente, então ler
  // direto na primeira renderização quebraria o SSR e causaria um
  // mismatch de hidratação — o efeito roda só depois de montar, seguro.
  useEffect(() => {
    const ultimo = window.localStorage.getItem(ULTIMO_MOTOBOY_KEY);
    if (ultimo && motoboys.some((m) => m.id === ultimo)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratação intencional a partir do localStorage, ver comentário acima
      setForm((f) => ({ ...f, motoboyId: ultimo }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function irPara(novoStep: 1 | 2 | 3) {
    setDirecao(novoStep > step ? 1 : -1);
    setStep(novoStep);
  }

  // Foco automático no primeiro campo de cada etapa, sem precisar clicar.
  const clienteInputRef = useRef<HTMLInputElement>(null);
  const valorInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (step === 1) clienteInputRef.current?.focus();
    if (step === 2) valorInputRef.current?.focus();
  }, [step]);

  function irParaEtapa2() {
    if (!form.clienteNome.trim()) {
      setErro("Informe o nome do cliente antes de continuar.");
      return;
    }
    setErro(null);
    irPara(2);
  }

  function irParaEtapa3() {
    const valor = parseCurrencyInput(form.valorPagamento);
    if (!valor || valor <= 0) {
      setErro("Informe um valor de pagamento válido.");
      return;
    }
    if (!form.formaPagamento) {
      setErro("Selecione a forma de pagamento.");
      return;
    }
    setErro(null);
    irPara(3);
  }

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await criarEntrega({
        data: form.data,
        clienteNome: form.clienteNome,
        numeroPedido: form.numeroPedido,
        numeroNfe: form.numeroNfe,
        valorPagamento: parseCurrencyInput(form.valorPagamento),
        formaPagamento: form.formaPagamento,
        motoboyId: form.motoboyId,
        clienteTelefone: form.clienteTelefone,
        endereco: form.endereco,
        observacoes: form.observacoes,
      });

      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível salvar a entrega.");
        return;
      }

      if (form.motoboyId) {
        window.localStorage.setItem(ULTIMO_MOTOBOY_KEY, form.motoboyId);
      }

      router.push("/canhotos");
      router.refresh();
    });
  }

  // Enter avança de etapa (equivalente a clicar "Avançar"/"Confirmar e
  // salvar") a partir de qualquer campo que não seja a textarea de
  // observações — lá o Enter precisa continuar quebrando linha normalmente.
  function aoPressionarTecla(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter") return;
    const alvo = e.target as HTMLElement;
    if (alvo.tagName === "TEXTAREA") return;

    if (e.ctrlKey || e.metaKey || step === 3) {
      e.preventDefault();
      if (step === 3) salvar();
      return;
    }

    e.preventDefault();
    if (step === 1) irParaEtapa2();
    else if (step === 2) irParaEtapa3();
  }

  const motoboySelecionado = motoboys.find((m) => m.id === form.motoboyId);
  const dataFormatada = form.data
    ? new Date(`${form.data}T00:00:00`).toLocaleDateString("pt-BR")
    : null;
  const valorFormatado = form.valorPagamento
    ? `R$ ${form.valorPagamento}`
    : null;

  return (
    <div className="mx-auto max-w-3xl" onKeyDown={aoPressionarTecla}>
      {/* Indicador de etapas */}
      <div className="mb-7 flex items-center">
        {ETAPAS.map((etapa, i) => (
          <div key={etapa.numero} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`grid size-9 place-items-center rounded-full border-2 text-sm font-bold transition-colors duration-300 ${
                  step === etapa.numero
                    ? "border-amber-500 bg-amber-500 text-white"
                    : step > etapa.numero
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                {step > etapa.numero ? <Check className="size-4" /> : etapa.numero}
              </div>
              <span
                className={`text-xs font-semibold transition-colors duration-300 ${
                  step === etapa.numero ? "text-[#0A1F44]" : "text-slate-400"
                }`}
              >
                {etapa.titulo}
              </span>
            </div>
            {i < ETAPAS.length - 1 && (
              <div
                className={`mx-2 mb-5 h-0.5 flex-1 transition-colors duration-300 ${
                  step > etapa.numero ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <Card className="overflow-hidden p-7">
        {/* Troca de etapa: conteúdo desliza na direção do avanço (direita
            ao avançar, esquerda ao voltar) com fade — "mode=wait" garante
            que a etapa antiga termina de sair antes da nova entrar, sem
            as duas se sobrepondo. Card com overflow-hidden pra não vazar
            o offset horizontal durante a transição. */}
        <AnimatePresence mode="wait" initial={false} custom={direcao}>
        {step === 1 && (
          <motion.div
            key={1}
            custom={direcao}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="flex flex-col gap-5"
          >
            <h2 className="text-[15px] font-bold">Dados do documento</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Data">
                <input
                  type="date"
                  className={inputClass}
                  value={form.data}
                  onChange={(e) => set("data", e.target.value)}
                />
              </Field>
              <Field label="Cliente">
                <input
                  ref={clienteInputRef}
                  type="text"
                  placeholder="Nome do cliente"
                  className={inputClass}
                  value={form.clienteNome}
                  onChange={(e) => set("clienteNome", e.target.value)}
                />
              </Field>
              <Field label="Nº do pedido" optional>
                <input
                  type="text"
                  className={inputClass}
                  value={form.numeroPedido}
                  onChange={(e) => set("numeroPedido", e.target.value)}
                />
              </Field>
              <Field label="Nº NFe" optional>
                <input
                  type="text"
                  className={inputClass}
                  value={form.numeroNfe}
                  onChange={(e) => set("numeroNfe", e.target.value)}
                />
              </Field>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key={2}
            custom={direcao}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="flex flex-col gap-5"
          >
            <h2 className="text-[15px] font-bold">Dados da entrega</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Valor do pagamento">
                <input
                  ref={valorInputRef}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  className={inputClass}
                  value={form.valorPagamento}
                  onChange={(e) =>
                    set("valorPagamento", maskCurrencyInput(e.target.value))
                  }
                />
              </Field>
              <Field label="Forma de pagamento">
                <select
                  className={inputClass}
                  value={form.formaPagamento}
                  onChange={(e) =>
                    set("formaPagamento", e.target.value as FormaPagamento | "")
                  }
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
                  <option value="">Selecione</option>
                  {motoboys.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Telefone" optional>
                <input
                  type="text"
                  inputMode="tel"
                  placeholder=""
                  className={inputClass}
                  value={form.clienteTelefone}
                  onChange={(e) =>
                    set("clienteTelefone", maskPhoneInput(e.target.value))
                  }
                />
              </Field>
              <Field label="Endereço" optional>
                <input
                  type="text"
                  placeholder="Rua, número, bairro"
                  className={inputClass}
                  value={form.endereco}
                  onChange={(e) => set("endereco", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Observações" optional>
              <textarea
                rows={3}
                className={inputClass}
                value={form.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
              />
            </Field>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key={3}
            custom={direcao}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="flex flex-col gap-6"
          >
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-bold">Dados do documento</h2>
                <button
                  type="button"
                  onClick={() => irPara(1)}
                  className="text-xs font-bold text-amber-600 hover:underline"
                >
                  Editar
                </button>
              </div>
              <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4 sm:grid-cols-4">
                <Resumo label="Data" value={dataFormatada} />
                <Resumo label="Cliente" value={form.clienteNome || null} />
                <Resumo label="Nº pedido" value={form.numeroPedido || null} />
                <Resumo label="Nº NFe" value={form.numeroNfe || null} />
              </dl>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-bold">Dados da entrega</h2>
                <button
                  type="button"
                  onClick={() => irPara(2)}
                  className="text-xs font-bold text-amber-600 hover:underline"
                >
                  Editar
                </button>
              </div>
              <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4 sm:grid-cols-4">
                <Resumo label="Valor" value={valorFormatado} />
                <Resumo
                  label="Pagamento"
                  value={
                    form.formaPagamento
                      ? FORMA_PAGAMENTO_LABEL[form.formaPagamento]
                      : null
                  }
                />
                <Resumo label="Motorista" value={motoboySelecionado?.nome ?? null} />
                <Resumo label="Telefone" value={form.clienteTelefone || null} />
                <Resumo label="Endereço" value={form.endereco || null} />
              </dl>
              {form.observacoes && (
                <p className="mt-3 text-sm text-slate-500">
                  <span className="font-bold text-slate-600">Observações: </span>
                  {form.observacoes}
                </p>
              )}
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {erro && (
          <div className="mt-5 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700">
            {erro}
          </div>
        )}

        <div className="mt-7 flex items-center justify-between border-t border-slate-200 pt-5">
          {step === 1 ? (
            <Link
              href="/canhotos"
              className="text-sm font-bold text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => irPara(step === 3 ? 2 : 1)}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-[color,transform] duration-150 hover:text-slate-700 active:scale-[0.97]"
            >
              <ArrowLeft className="size-4" />
              Voltar
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={step === 1 ? irParaEtapa2 : irParaEtapa3}
              className="inline-flex items-center gap-1.5 bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-amber-400 active:scale-[0.97]"
            >
              Avançar
              <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={salvar}
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
                  Confirmar e salvar
                  <span className="ml-1 text-xs font-normal text-white/60">
                    (Ctrl+Enter)
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
