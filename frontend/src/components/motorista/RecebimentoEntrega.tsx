"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Check, Eraser, Loader2, PenLine, Upload } from "lucide-react";
import { anexarComprovante, confirmarEntrega, salvarObservacaoMotorista } from "@/app/motorista/actions";
import type { EntregaMotorista } from "@/lib/data/entregas-motorista";

export function RecebimentoEntrega({ entrega }: { entrega: EntregaMotorista }) {
  const [foto, setFoto] = useState<File | null>(null);
  const [assinatura, setAssinatura] = useState<File | null>(null);
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pending, startTransition] = useTransition();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [desenhando, setDesenhando] = useState(false);

  function iniciarDesenho(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setDesenhando(true);
  }

  function desenhar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0A1F44";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  }

  function limparAssinatura() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setAssinatura(null);
  }

  function capturarAssinatura() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) setAssinatura(new File([blob], "assinatura.png", { type: "image/png" }));
    }, "image/png");
  }

  function finalizar() {
    setErro(null);
    if (!foto) {
      setErro("Tire ou selecione a foto da entrega.");
      return;
    }
    if (!assinatura) {
      setErro("Colete a assinatura do cliente.");
      return;
    }

    startTransition(async () => {
      const fotoResult = await anexarComprovante(entrega.id, "foto", foto, crypto.randomUUID());
      if (!fotoResult.ok) {
        setErro(fotoResult.error ?? "Não foi possível enviar a foto.");
        return;
      }

      const assinaturaResult = await anexarComprovante(
        entrega.id,
        "assinatura_cliente",
        assinatura,
        crypto.randomUUID()
      );
      if (!assinaturaResult.ok) {
        setErro(assinaturaResult.error ?? "Não foi possível enviar a assinatura.");
        return;
      }

      const obsResult = await salvarObservacaoMotorista(entrega.id, observacao);
      if (!obsResult.ok) {
        setErro(obsResult.error ?? "Não foi possível salvar a observação.");
        return;
      }

      const confirmResult = await confirmarEntrega(entrega.id);
      if (!confirmResult.ok) {
        setErro(confirmResult.error ?? "Não foi possível confirmar a entrega.");
        return;
      }

      setSucesso(true);
      window.location.href = "/motorista";
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Camera className="size-5 text-[#0A1F44]" />
          <h2 className="font-bold text-[#0A1F44]">Foto da entrega</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">Registre o comprovante antes de finalizar.</p>
        <input
          className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
        />
        {foto && <p className="mt-2 text-xs font-semibold text-emerald-600"><Check className="mr-1 inline size-3" /> Foto selecionada</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenLine className="size-5 text-[#0A1F44]" />
            <h2 className="font-bold text-[#0A1F44]">Assinatura do cliente</h2>
          </div>
          <button type="button" onClick={limparAssinatura} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
            <Eraser className="size-3.5" /> Limpar
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">Peça para o cliente assinar no quadro abaixo.</p>
        <canvas
          ref={canvasRef}
          width={700}
          height={300}
          className="mt-3 h-44 w-full touch-none rounded-xl border border-dashed border-slate-300 bg-slate-50"
          onPointerDown={iniciarDesenho}
          onPointerMove={desenhar}
          onPointerUp={() => { setDesenhando(false); capturarAssinatura(); }}
          onPointerCancel={() => setDesenhando(false)}
        />
        {assinatura && <p className="mt-2 text-xs font-semibold text-emerald-600"><Check className="mr-1 inline size-3" /> Assinatura registrada</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-bold text-[#0A1F44]" htmlFor="observacao">Observação</label>
        <textarea
          id="observacao"
          value={observacao}
          maxLength={1000}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Alguma informação sobre a entrega?"
          className="mt-2 min-h-24 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-slate-400"
        />
        <p className="mt-1 text-right text-xs text-slate-400">{observacao.length}/1000</p>
      </section>

      {erro && <div className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700">{erro}</div>}

      <button
        type="button"
        disabled={pending || sucesso}
        onClick={finalizar}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <><Loader2 className="size-4 animate-spin" /> Finalizando...</> : <><Upload className="size-4" /> Finalizar entrega</>}
      </button>
    </div>
  );
}
