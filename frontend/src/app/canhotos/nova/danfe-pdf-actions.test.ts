import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/operador-auth", () => ({ obterOperadorAutenticado: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checarRateLimit: vi.fn() }));
vi.mock("@/lib/pdf-texto", () => ({ extrairTextoPdf: vi.fn() }));

import { obterOperadorAutenticado } from "@/lib/operador-auth";
import { checarRateLimit } from "@/lib/rate-limit";
import { extrairTextoPdf } from "@/lib/pdf-texto";
import { lerDanfePdf } from "./danfe-pdf-actions";

const PDF_BYTES = new TextEncoder().encode("%PDF-1.7 conteúdo qualquer");

function pdfFile(bytes = PDF_BYTES, nome = "danfe.pdf") {
  return new File([bytes], nome, { type: "application/pdf" });
}

function dadosComArquivo(arquivo: File) {
  const fd = new FormData();
  fd.append("documento", arquivo);
  return fd;
}

describe("lerDanfePdf", () => {
  it("recusa sem sessão", async () => {
    vi.mocked(obterOperadorAutenticado).mockResolvedValue(null);
    const resultado = await lerDanfePdf(dadosComArquivo(pdfFile()));
    expect(resultado).toEqual({
      ok: false,
      error: "Sessão inválida ou expirada.",
    });
  });

  it("recusa acima do rate limit", async () => {
    vi.mocked(obterOperadorAutenticado).mockResolvedValue({
      tipo: "admin",
    } as never);
    vi.mocked(checarRateLimit).mockResolvedValue({ permitido: false } as never);
    const resultado = await lerDanfePdf(dadosComArquivo(pdfFile()));
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toMatch(/Muitas tentativas/);
  });

  it("recusa arquivo que não é PDF", async () => {
    vi.mocked(obterOperadorAutenticado).mockResolvedValue({
      tipo: "admin",
    } as never);
    vi.mocked(checarRateLimit).mockResolvedValue({ permitido: true } as never);
    const resultado = await lerDanfePdf(
      dadosComArquivo(pdfFile(new TextEncoder().encode("<xml/>")))
    );
    expect(resultado).toEqual({ ok: false, error: "Arquivo não é um PDF válido." });
  });

  it("recusa quando o PDF não tem texto (provável escaneado)", async () => {
    vi.mocked(obterOperadorAutenticado).mockResolvedValue({
      tipo: "admin",
    } as never);
    vi.mocked(checarRateLimit).mockResolvedValue({ permitido: true } as never);
    vi.mocked(extrairTextoPdf).mockResolvedValue("   ");
    const resultado = await lerDanfePdf(dadosComArquivo(pdfFile()));
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toMatch(/escaneado/);
  });

  it("lê os dados do texto extraído do PDF", async () => {
    vi.mocked(obterOperadorAutenticado).mockResolvedValue({
      tipo: "admin",
    } as never);
    vi.mocked(checarRateLimit).mockResolvedValue({ permitido: true } as never);
    vi.mocked(extrairTextoPdf).mockResolvedValue(
      "VALOR TOTAL DA NOTA\n1.234,56\nPedido: 887352"
    );
    const resultado = await lerDanfePdf(dadosComArquivo(pdfFile()));
    expect(resultado.ok).toBe(true);
    expect(resultado.dados).toEqual({ valor: 1234.56, numeroPedido: "887352" });
  });
});
