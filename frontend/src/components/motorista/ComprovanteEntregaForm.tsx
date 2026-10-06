"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  Eraser,
  Loader2,
  PenLine,
  ReceiptText,
} from "lucide-react";
import { confirmarEntrega } from "@/app/motorista/actions";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import type { FormaPagamento } from "@/types/database";

const TAMANHO_MAX_FOTO = 8 * 1024 * 1024;

export function ComprovanteEntregaForm({
  entregaId,
  formaPagamento,
}: {
  entregaId: string;
  formaPagamento: FormaPagamento;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhandoRef = useRef(false);
  const assinaturaMarcadaRef = useRef(false);
  const [fotoEntrega, setFotoEntrega] = useState<File | null>(null);
  const [fotoEntregaUrl, setFotoEntregaUrl] = useState<string | null>(null);
  const [comprovantePix, setComprovantePix] = useState<File | null>(null);
  const [comprovantePixUrl, setComprovantePixUrl] = useState<string | null>(null);
  const [temAssinatura, setTemAssinatura] = useState(false);
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const largura = Math.max(canvas.clientWidth, 1);
    const altura = Math.max(canvas.clientHeight, 1);
    const escala = Math.max(window.devicePixelRatio || 1, 1);

    canvas.width = Math.round(largura * escala);
    canvas.height = Math.round(altura * escala);

    const contexto = canvas.getContext("2d");
    if (!contexto) return;

    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, canvas.width, canvas.height);
    contexto.strokeStyle = "#0A1F44";
    contexto.lineWidth = 2.25 * escala;
    contexto.lineCap = "round";
    contexto.lineJoin = "round";
  }, []);

  function pontoNoCanvas(evento: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = evento.currentTarget;
    const retangulo = canvas.getBoundingClientRect();

    return {
      x: (evento.clientX - retangulo.left) * (canvas.width / retangulo.width),
      y: (evento.clientY - retangulo.top) * (canvas.height / retangulo.height),
    };
  }

  function iniciarAssinatura(evento: React.PointerEvent<HTMLCanvasElement>) {
    const contexto = evento.currentTarget.getContext("2d");
    if (!contexto) return;

    evento.currentTarget.setPointerCapture(evento.pointerId);
    desenhandoRef.current = true;

    const ponto = pontoNoCanvas(evento);
    contexto.beginPath();
    contexto.moveTo(ponto.x, ponto.y);
  }

  function desenharAssinatura(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhandoRef.current) return;

    const contexto = evento.currentTarget.getContext("2d");
    if (!contexto) return;

    const ponto = pontoNoCanvas(evento);
    contexto.lineTo(ponto.x, ponto.y);
    contexto.stroke();

    if (!assinaturaMarcadaRef.current) {
      assinaturaMarcadaRef.current = true;
      setTemAssinatura(true);
    }
  }

  function encerrarAssinatura(evento: React.PointerEvent<HTMLCanvasElement>) {
    desenhandoRef.current = false;

    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
      evento.currentTarget.releasePointerCapture(evento.pointerId);
    }
  }

  function limparAssinatura() {
    const canvas = canvasRef.current;
    const contexto = canvas?.getContext("2d");
    if (!canvas || !contexto) return;

    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, canvas.width, canvas.height);
    contexto.strokeStyle = "#0A1F44";
    assinaturaMarcadaRef.current = false;
    setTemAssinatura(false);
  }

  async function gerarArquivoAssinatura(): Promise<File | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });

    if (!blob) return null;

    return new File([blob], "assinatura.png", { type: "image/png" });
  }

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
      setErro("Tire uma foto da entrega antes de finalizar.");
      return;
    }

    if (!temAssinatura) {
      setErro("Peça ao cliente para assinar antes de confirmar.");
      return;
    }

    startTransition(async () => {
      const assinatura = await gerarArquivoAssinatura();

      if (!assinatura) {
        setErro("Não foi possível preparar a assinatura. Tente novamente.");
        return;
      }

      const formData = new FormData();
      formData.set("fotoEntrega", fotoEntrega);
      if (formaPagamento === "pix" && comprovantePix) {
        formData.set("comprovantePix", comprovantePix);
      }
      formData.set("assinatura", assinatura);

      // Sem sinal/4G caindo é comum na rua: se o envio falhar por rede, a
      // exceção não pode derrubar a tela e fazer o motorista perder a foto
      // e a assinatura já coletadas — mostra o aviso e deixa tentar de novo.
      let resultado: Awaited<ReturnType<typeof confirmarEntrega>>;
      try {
        resultado = await confirmarEntrega(entregaId, formData);
      } catch {
        setErro(
          "Sem conexão com o servidor. Confira o sinal e toque em confirmar de novo — a foto e a assinatura foram mantidas."
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

  return (
    <div className="p-4">
      <div>
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
          Foto da entrega
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

        <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#1768D8] bg-white px-4 py-3 text-sm font-black text-[#1768D8] transition hover:bg-[#F5F9FF]">
          <Camera className="size-4" />
          {fotoEntrega ? "Tirar outra foto" : "Tirar foto da entrega"}
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

      <div className="mt-5 border-t border-slate-100 pt-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
            Assinatura do cliente
          </p>
          <button
            type="button"
            disabled={pending || !temAssinatura}
            onClick={limparAssinatura}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Eraser className="size-3.5" />
            Limpar
          </button>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-300 bg-white">
          {!temAssinatura && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm font-medium text-slate-400">
              <PenLine className="size-4" />
              Assine aqui
            </div>
          )}
          <canvas
            ref={canvasRef}
            aria-label="Área para assinatura do cliente"
            className="h-40 w-full touch-none"
            onPointerDown={iniciarAssinatura}
            onPointerMove={desenharAssinatura}
            onPointerUp={encerrarAssinatura}
            onPointerCancel={encerrarAssinatura}
          />
        </div>
      </div>

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
