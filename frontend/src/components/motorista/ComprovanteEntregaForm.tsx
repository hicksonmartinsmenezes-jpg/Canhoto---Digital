"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  Loader2,
  Package,
  Plus,
  ReceiptText,
  X,
} from "lucide-react";
import { confirmarEntrega } from "@/app/motorista/actions";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import { MAX_FOTOS_PRODUTO } from "@/lib/comprovante-limites";
import { salvarRascunho } from "@/lib/comprovante-pendente";
import { ComprovanteGuardadoPainel } from "@/components/motorista/ComprovanteGuardadoPainel";
import {
  enviarRascunhoSalvo,
  useRascunhosComprovante,
} from "@/components/motorista/useRascunhosComprovante";
import type { FormaPagamento } from "@/types/database";

const TAMANHO_MAX_FOTO = 8 * 1024 * 1024;

interface FotoProdutoLocal {
  id: string;
  arquivo: File;
  url: string;
}

export function ComprovanteEntregaForm({
  entregaId,
  formaPagamento,
  rotulo,
}: {
  entregaId: string;
  formaPagamento: FormaPagamento;
  /** Identifica a entrega no aviso da lista quando o envio fica pendente. */
  rotulo?: string;
}) {
  const router = useRouter();
  const { rascunhos, enviando, enviarAgora, descartar, recarregar } =
    useRascunhosComprovante(entregaId);
  const rascunhoGuardado = rascunhos[0] ?? null;
  const [fotoEntrega, setFotoEntrega] = useState<File | null>(null);
  const [fotoEntregaUrl, setFotoEntregaUrl] = useState<string | null>(null);
  const [comprovantePix, setComprovantePix] = useState<File | null>(null);
  const [comprovantePixUrl, setComprovantePixUrl] = useState<string | null>(null);
  const [fotosProduto, setFotosProduto] = useState<FotoProdutoLocal[]>([]);
  const fotosProdutoRef = useRef<FotoProdutoLocal[]>([]);
  const [recebedorNome, setRecebedorNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Foto sendo reduzida no aparelho (leva ~1 s): segura o botão Finalizar.
  const [preparandoImagem, setPreparandoImagem] = useState(false);
  const selecaoFotoRef = useRef(0);
  const selecaoPixRef = useRef(0);
  const preparosEmAndamentoRef = useRef(0);

  async function prepararImagem(
    arquivo: File,
    opcoes?: Parameters<typeof comprimirImagem>[1]
  ): Promise<File> {
    preparosEmAndamentoRef.current += 1;
    setPreparandoImagem(true);
    try {
      return await comprimirImagem(arquivo, opcoes);
    } finally {
      preparosEmAndamentoRef.current -= 1;
      if (preparosEmAndamentoRef.current === 0) setPreparandoImagem(false);
    }
  }

  useEffect(() => {
    return () => {
      if (fotoEntregaUrl) URL.revokeObjectURL(fotoEntregaUrl);
    };
  }, [fotoEntregaUrl]);

  useEffect(() => {
    return () => {
      if (comprovantePixUrl) URL.revokeObjectURL(comprovantePixUrl);
    };
  }, [comprovantePixUrl]);

  useEffect(() => {
    fotosProdutoRef.current = fotosProduto;
  }, [fotosProduto]);

  useEffect(() => {
    return () => {
      for (const foto of fotosProdutoRef.current) {
        URL.revokeObjectURL(foto.url);
      }
    };
  }, []);

  function validarImagem(arquivo: File): string | null {
    if (!arquivo.type.startsWith("image/")) {
      return "Selecione uma imagem válida.";
    }

    if (arquivo.size > TAMANHO_MAX_FOTO) {
      return "A imagem deve ter no máximo 8 MB.";
    }

    return null;
  }

  async function selecionarFotoEntrega(arquivo: File | undefined) {
    setErro(null);
    const selecao = ++selecaoFotoRef.current;

    if (!arquivo) {
      setFotoEntrega(null);
      setFotoEntregaUrl(null);
      return;
    }

    const reduzida = await prepararImagem(arquivo);
    // Se o motorista escolheu outra foto enquanto esta era reduzida, descarta.
    if (selecao !== selecaoFotoRef.current) return;

    const erroImagem = validarImagem(reduzida);
    if (erroImagem) {
      setErro(erroImagem);
      return;
    }

    setFotoEntrega(reduzida);
    setFotoEntregaUrl(URL.createObjectURL(reduzida));
  }

  async function adicionarFotoProduto(arquivo: File | undefined) {
    setErro(null);
    if (!arquivo) return;

    const reduzida = await prepararImagem(arquivo);

    const erroImagem = validarImagem(reduzida);
    if (erroImagem) {
      setErro(erroImagem);
      return;
    }

    setFotosProduto((atuais) => {
      if (atuais.length >= MAX_FOTOS_PRODUTO) return atuais;
      return [
        ...atuais,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          arquivo: reduzida,
          url: URL.createObjectURL(reduzida),
        },
      ];
    });
  }

  function removerFotoProduto(id: string) {
    setFotosProduto((atuais) => {
      const removida = atuais.find((foto) => foto.id === id);
      if (removida) URL.revokeObjectURL(removida.url);
      return atuais.filter((foto) => foto.id !== id);
    });
  }

  async function selecionarComprovantePix(arquivo: File | undefined) {
    setErro(null);
    const selecao = ++selecaoPixRef.current;

    if (!arquivo) {
      setComprovantePix(null);
      setComprovantePixUrl(null);
      return;
    }

    // Comprovante tem texto pequeno: resolução um pouco maior que a da foto.
    const reduzida = await prepararImagem(arquivo, {
      ladoMaximo: 2000,
      qualidade: 0.85,
    });
    if (selecao !== selecaoPixRef.current) return;

    const erroImagem = validarImagem(reduzida);
    if (erroImagem) {
      setErro(erroImagem);
      return;
    }

    setComprovantePix(reduzida);
    setComprovantePixUrl(URL.createObjectURL(reduzida));
  }

  function confirmar() {
    setErro(null);

    if (preparandoImagem) {
      setErro("Aguarde a foto terminar de ser preparada.");
      return;
    }

    if (!fotoEntrega) {
      setErro("Tire a foto do canhoto assinado antes de finalizar.");
      return;
    }

    const nomeRecebedor = recebedorNome.replace(/\s+/g, " ").trim();
    if (nomeRecebedor.length < 2) {
      setErro("Informe o nome de quem recebeu a mercadoria.");
      return;
    }

    startTransition(async () => {
      const pixParaEnviar = formaPagamento === "pix" ? comprovantePix : null;

      // 1) Guarda tudo no aparelho ANTES de enviar: se o sinal cair, o app for
      //    fechado ou a página recarregar, as fotos não se perdem.
      const guardado = await salvarRascunho({
        entregaId,
        rotulo: rotulo ?? null,
        recebedorNome: nomeRecebedor,
        fotoEntrega,
        comprovantePix: pixParaEnviar,
        fotosProduto: fotosProduto.map((foto) => foto.arquivo),
      });

      if (guardado) {
        // 2) Envia o que foi guardado. Se não der agora, o painel de
        //    "comprovante guardado" assume e reenvia sozinho.
        const resultado = await enviarRascunhoSalvo(entregaId);
        await recarregar();

        if (resultado.estado === "enviado") {
          router.refresh();
        }
        return;
      }

      // O aparelho não permitiu guardar (navegação restrita): envio direto,
      // mantendo as fotos na tela se falhar.
      const formData = new FormData();
      formData.set("recebedorNome", nomeRecebedor);
      formData.set("fotoEntrega", fotoEntrega);
      if (pixParaEnviar) formData.set("comprovantePix", pixParaEnviar);
      for (const foto of fotosProduto) {
        formData.append("fotoProduto", foto.arquivo);
      }

      let resultado: Awaited<ReturnType<typeof confirmarEntrega>>;
      try {
        resultado = await confirmarEntrega(entregaId, formData);
      } catch {
        setErro(
          "Sem conexão com o servidor. Confira o sinal e toque em confirmar de novo — as fotos foram mantidas."
        );
        return;
      }

      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível confirmar a entrega.");
        return;
      }

      router.refresh();
    });
  }

  function descartarGuardado() {
    void descartar(entregaId).then(() => {
      // Recomeça do zero: o que estava na tela foi para o rascunho apagado.
      setFotoEntrega(null);
      setFotoEntregaUrl(null);
      setComprovantePix(null);
      setComprovantePixUrl(null);
      for (const foto of fotosProdutoRef.current) {
        URL.revokeObjectURL(foto.url);
      }
      setFotosProduto([]);
      setErro(null);
    });
  }

  if (rascunhoGuardado) {
    return (
      <ComprovanteGuardadoPainel
        rascunho={rascunhoGuardado}
        enviando={enviando.includes(entregaId)}
        onEnviarAgora={() => void enviarAgora(entregaId)}
        onDescartar={descartarGuardado}
      />
    );
  }

  return (
    <div className="p-4">
      <div className="mb-5">
        <label
          htmlFor={`recebedor-${entregaId}`}
          className="mb-2 block text-[11px] font-black uppercase tracking-[0.08em] text-slate-500"
        >
          Nome de quem recebeu
        </label>
        <input
          id={`recebedor-${entregaId}`}
          type="text"
          autoComplete="off"
          maxLength={120}
          value={recebedorNome}
          disabled={pending}
          onChange={(event) => setRecebedorNome(event.target.value)}
          placeholder="Nome completo de quem assinou o canhoto"
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#15924A]"
        />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
          Foto do canhoto assinado
        </p>

        {fotoEntregaUrl && (
          <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fotoEntregaUrl}
              alt="Prévia da foto da entrega"
              className="max-h-52 w-full object-cover"
            />
          </div>
        )}

        <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
          <Camera className="size-4" />
          {fotoEntrega ? "Tirar outra foto" : "Tirar foto do canhoto"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={pending}
            onChange={(event) => selecionarFotoEntrega(event.target.files?.[0])}
          />
        </label>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-5">
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
          Fotos do produto{" "}
          <span className="font-semibold normal-case tracking-normal text-slate-400">
            (opcional)
          </span>
        </p>

        {fotosProduto.length === 0 ? (
          <label
            className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 ${pending ? "pointer-events-none opacity-50" : ""}`}
          >
            <Package className="size-4" />
            Tirar foto do produto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={pending}
              onChange={(event) => {
                const arquivo = event.target.files?.[0];
                event.target.value = "";
                void adicionarFotoProduto(arquivo);
              }}
            />
          </label>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {fotosProduto.map((foto, indice) => (
              <div
                key={foto.id}
                className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={foto.url}
                  alt={`Prévia da foto do produto ${indice + 1}`}
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  aria-label={`Remover foto do produto ${indice + 1}`}
                  disabled={pending}
                  onClick={() => removerFotoProduto(foto.id)}
                  className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/75 disabled:opacity-50"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}

            {fotosProduto.length < MAX_FOTOS_PRODUTO && (
              <label
                className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 bg-white text-slate-600 transition hover:border-[#1768D8] hover:bg-[#F5F9FF] hover:text-[#1768D8] ${pending ? "pointer-events-none opacity-50" : ""}`}
              >
                <Plus className="size-6" />
                <span className="text-[11px] font-black">
                  Adicionar
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  disabled={pending}
                  onChange={(event) => {
                    const arquivo = event.target.files?.[0];
                    // Permite escolher a mesma foto de novo depois de remover.
                    event.target.value = "";
                    void adicionarFotoProduto(arquivo);
                  }}
                />
              </label>
            )}
          </div>
        )}
      </div>

      {formaPagamento === "pix" && (
        <div className="mt-5 border-t border-slate-100 pt-5">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
            Comprovante Pix{" "}
            <span className="font-semibold normal-case tracking-normal text-slate-400">
              (opcional)
            </span>
          </p>

          {comprovantePixUrl && (
            <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={comprovantePixUrl}
                alt="Prévia do comprovante Pix"
                className="max-h-52 w-full object-cover"
              />
            </div>
          )}

          <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
            <ReceiptText className="size-4" />
            {comprovantePix ? "Trocar comprovante" : "Fotografar comprovante Pix"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={pending}
              onChange={(event) =>
                selecionarComprovantePix(event.target.files?.[0])
              }
            />
          </label>
        </div>
      )}

      {erro && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
          {erro}
        </div>
      )}

      <button
        type="button"
        disabled={pending || preparandoImagem}
        onClick={confirmar}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#15924A] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#117D3F] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Finalizando...
          </>
        ) : preparandoImagem ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Preparando foto...
          </>
        ) : (
          <>
            <CheckCircle2 className="size-4" />
            Finalizar entrega
          </>
        )}
      </button>
    </div>
  );
}
