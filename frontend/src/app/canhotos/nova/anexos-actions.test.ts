import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/operador-auth", () => ({ obterOperadorAutenticado: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checarRateLimit: vi.fn() }));
vi.mock("@/lib/comprovantes-storage", () => ({
  diretorioRaizUploads: () => process.env.CANHOTO_UPLOAD_DIR as string,
  diretorioRelativoEntrega: () => "entregas/ana/entrega-000007",
}));

import { getDb } from "@/lib/db";
import { obterOperadorAutenticado } from "@/lib/operador-auth";
import { checarRateLimit } from "@/lib/rate-limit";
import { anexarDocumentosEntrega } from "./anexos-actions";

const ID = "11111111-1111-4111-8111-111111111111";
const NFE =
  '<nfeProc><NFe><infNFe Id="x"><dest><xNome>Ana</xNome></dest></infNFe></NFe></nfeProc>';

function arquivos(...itens: File[]) {
  const fd = new FormData();
  for (const item of itens) fd.append("documentos", item);
  return fd;
}

function configurarDb(entrega: { setorId: string | null } | null) {
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const select = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi
      .fn()
      .mockResolvedValue(
        entrega ? [{ numero: 7, clienteNome: "Ana", ...entrega }] : []
      ),
  };
  select.from.mockReturnValue(select);
  select.where.mockReturnValue(select);
  vi.mocked(getDb).mockReturnValue({
    select: () => select,
    insert: () => ({ values: insertValues }),
  } as never);
  return insertValues;
}

describe("anexarDocumentosEntrega", () => {
  let pasta: string;

  beforeEach(async () => {
    pasta = await mkdtemp(path.join(os.tmpdir(), "canhoto-anexos-"));
    process.env.CANHOTO_UPLOAD_DIR = pasta;
    vi.mocked(checarRateLimit).mockResolvedValue({ permitido: true } as never);
    vi.mocked(obterOperadorAutenticado).mockResolvedValue({
      tipo: "admin",
      usuarioAdminId: "a",
      colaboradorId: null,
      setorId: null,
    });
  });

  afterEach(async () => {
    delete process.env.CANHOTO_UPLOAD_DIR;
    await rm(pasta, { recursive: true, force: true });
  });

  async function gravados() {
    return (await readdir(pasta, { recursive: true })).filter((n) =>
      /\.(xml|pdf)$/.test(n)
    );
  }

  it("grava XML da NF-e e PDF e registra os anexos", async () => {
    const insertValues = configurarDb({ setorId: null });
    const resultado = await anexarDocumentosEntrega(
      ID,
      arquivos(
        new File([NFE], "nota.xml", { type: "text/xml" }),
        new File(["%PDF-1.7 conteudo"], "danfe.pdf", { type: "application/pdf" })
      )
    );
    expect(resultado).toEqual({ ok: true });
    expect(await gravados()).toHaveLength(2);
    const linhas = insertValues.mock.calls[0][0] as Array<{ tipo: string }>;
    expect(linhas.map((l) => l.tipo)).toEqual(["xml_nfe", "danfe_pdf"]);
  });

  it("recusa arquivo que não é NF-e e não grava nada", async () => {
    const insertValues = configurarDb({ setorId: null });
    const resultado = await anexarDocumentosEntrega(
      ID,
      arquivos(
        new File(["%PDF-1.7 ok"], "danfe.pdf"),
        new File(["<html></html>"], "pagina.xml")
      )
    );
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toContain("NF-e");
    expect(await gravados()).toHaveLength(0);
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("recusa extensão diferente de XML/PDF e PDF falso", async () => {
    configurarDb({ setorId: null });
    const ruim = await anexarDocumentosEntrega(
      ID,
      arquivos(new File(["x"], "foto.png"))
    );
    expect(ruim.ok).toBe(false);
    const falso = await anexarDocumentosEntrega(
      ID,
      arquivos(new File(["nao e pdf"], "x.pdf"))
    );
    expect(falso.error).toContain("PDF válido");
  });

  it("gestor de outro setor não anexa", async () => {
    vi.mocked(obterOperadorAutenticado).mockResolvedValue({
      tipo: "gestor_setor",
      colaboradorId: "c",
      setorId: "setor-a",
    });
    configurarDb({ setorId: "setor-b" });
    const resultado = await anexarDocumentosEntrega(
      ID,
      arquivos(new File([NFE], "nota.xml"))
    );
    expect(resultado).toEqual({ ok: false, error: "Entrega não encontrada." });
  });

  it("exige sessão", async () => {
    vi.mocked(obterOperadorAutenticado).mockResolvedValue(null);
    const resultado = await anexarDocumentosEntrega(
      ID,
      arquivos(new File([NFE], "nota.xml"))
    );
    expect(resultado.ok).toBe(false);
  });
});
