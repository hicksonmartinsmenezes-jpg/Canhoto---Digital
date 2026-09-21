"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  Eraser,
  Loader2,
  PenLine,
} from "lucide-react";
import { confirmarEntrega } from "@/app/motorista/actions";

const TAMANHO_MAX_FOTO = 8 * 1024 * 1024;

export function ComprovanteEntregaForm({
  entregaId,
}: {
  entregaId: string;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhandoRef = useRef(false);
  const assinaturaMarcadaRef = useRef(false);
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [temAssinatura, setTemAssinatura] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (fotoUrl) URL.revokeObjectURL(fotoUrl);
    };
  }, [fotoUrl]);

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

  function selecionarFoto(arquivo: File | undefined) {
    setErro(null);

    if (!arquivo) {
      setFoto(null);
      setFotoUrl(null);
      return;
    }

    if (!arquivo.type.startsWith("image/")) {
      setErro("Selecione uma imagem válida.");
      return;
    }

    if (arquivo.size > TAMANHO_MAX_FOTO) {
      setErro("A foto deve ter no máximo 8 MB.");
      return;
    }

    setFoto(arquivo);
    setFotoUrl(URL.createObjectURL(arquivo));
  }

  function confirmar() {
    setErro(null);

    if (!foto) {
      setErro("Tire uma foto do comprovante antes de confirmar.");
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
      formData.set("foto", foto);
      formData.set("assinatura", assinatura);

      const resultado = await confirmarEntrega(entregaId, formData);

      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível confirmar a entrega.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center bg-[#0A1F44] text-white">
          <CheckCircle2 className="size-5" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-[#0A1F44]">
            Comprovante da entrega
          </h3>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            Foto e assinatura são obrigatórias para concluir.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          Foto do comprovante
        </p>

        {fotoUrl && (
          <div className="mb-3 overflow-hidden border border-slate-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fotoUrl}
              alt="Prévia da foto do comprovante"
              className="max-h-52 w-full object-cover"
            />
          </div>
        )}

        <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 border border-[#0A1F44] bg-white px-4 py-2.5 text-sm font-bold text-[#0A1F44] transition-colors hover:bg-slate-100">
          <Camera className="size-4" />
          {foto ? "Tirar outra foto" : "Tirar foto"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={pending}
            onChange={(event) => selecionarFoto(event.target.files?.[0])}
          />
        </label>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Assinatura do cliente
          </p>
          <button
            type="button"
            disabled={pending || !temAssinatura}
            onClick={limparAssinatura}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Eraser className="size-3.5" />
            Limpar
          </button>
        </div>

        <div className="relative border border-slate-300 bg-white">
          {!temAssinatura && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm text-slate-400">
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
        <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
          {erro}
        </div>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={confirmar}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-[#F2B22E] px-4 py-3 text-sm font-bold text-[#0A1F44] transition-colors hover:bg-[#F7C84A] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Salvando comprovantes...
          </>
        ) : (
          <>
            <CheckCircle2 className="size-4" />
            Confirmar entrega
          </>
        )}
      </button>
    </div>
  );
}
