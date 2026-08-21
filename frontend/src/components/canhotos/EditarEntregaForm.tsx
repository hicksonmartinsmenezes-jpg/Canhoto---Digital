"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/canhotos/form-fields";
import { FORMA_PAGAMENTO_LABEL, STATUS_LABEL } from "@/lib/status";
import { maskCurrencyInput, maskPhoneInput, parseCurrencyInput } from "@/lib/format";
import { atualizarEntrega } from "@/app/canhotos/[id]/editar/actions";
import type { EntregaDetalhe } from "@/lib/data/entregas";
import type { MotoboyOption } from "@/lib/data/motoboys";
import type { FormaPagamento, StatusEntrega } from "@/types/database";

interface EditarEntregaFormProps {
  entrega: EntregaDetalhe;
  motoboys: MotoboyOption[];
}

export function EditarEntregaForm({ entrega, motoboys }: EditarEntregaFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState({
    data: entrega.data,
    clienteNome: entrega.clienteNome,
    numeroPedido: entrega.numeroPedido,
    numeroNfe: entrega.numeroNfe,
    valorPagamento: maskCurrencyInput(
      String(Math.round(Number(entrega.valorPagamento) * 100))
    ),
    formaPagamento: entrega.formaPagamento as FormaPagamento | "",
    motoboyId: entrega.motoboyId,
    clienteTelefone: entrega.clienteTelefone,
    endereco: entrega.endereco,
    observacoes: entrega.observacoes,
    status: entrega.status as StatusEntrega,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function salvar() {
    const valor = parseCurrencyInput(form.valorPagamento);
    if (!form.clienteNome.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }
    if (!valor || valor <= 0) {
      setErro("Informe um valor de pagamento válido.");
      return;
    }
    if (!form.formaPagamento) {
      setErro("Selecione a forma de pagamento.");
      return;
    }

    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarEntrega(entrega.id, {
        data: form.data,
        clienteNome: form.clienteNome,
        numeroPedido: form.numeroPedido,
        numeroNfe: form.numeroNfe,
        valorPagamento: valor,
        formaPagamento: form.formaPagamento,
        motoboyId: form.motoboyId,
        clienteTelefone: form.clienteTelefone,
        endereco: form.endereco,
        observacoes: form.observacoes,
        status: form.status,
      });

      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível salvar as alterações.");
        return;
      }

      router.push("/canhotos");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="p-7">
        <div className="flex flex-col gap-7">
          <div>
            <h2 className="mb-4 text-[15px] font-bold">Dados do documento</h2>
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
                  type="text"
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
          </div>

          <div>
            <h2 className="mb-4 text-[15px] font-bold">Dados da entrega</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Valor do pagamento">
                <input
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
                  placeholder="(00) 00000-0000"
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
            <div className="mt-5">
              <Field label="Observações" optional>
                <textarea
                  rows={3}
                  className={inputClass}
                  value={form.observacoes}
                  onChange={(e) => set("observacoes", e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-[15px] font-bold">Situação</h2>
            <div className="max-w-xs">
              <Field label="Status da entrega">
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as StatusEntrega)}
                >
                  {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </div>

        {erro && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {erro}
          </div>
        )}

        <div className="mt-7 flex items-center justify-between border-t border-slate-200 pt-5">
          <Link
            href="/canhotos"
            className="text-sm font-bold text-slate-500 hover:text-slate-700"
          >
            Cancelar
          </Link>
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
                Salvar alterações
              </>
            )}
          </button>
        </div>
      </Card>
    </div>
  );
}
