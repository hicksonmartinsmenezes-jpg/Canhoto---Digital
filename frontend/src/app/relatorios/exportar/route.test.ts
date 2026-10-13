import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getRelatorioEntregas } from "@/lib/data/entregas";
import { arquivarRelatorioCsv } from "@/lib/relatorios-storage";
import { obterAdminAutenticado } from "@/lib/admin-auth";
import { GET } from "./route";

vi.mock("@/lib/data/entregas", () => ({ getRelatorioEntregas: vi.fn() }));
vi.mock("@/lib/relatorios-storage", () => ({ arquivarRelatorioCsv: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ obterAdminAutenticado: vi.fn() }));

function relatorioComCliente(cliente: string) {
  return {
    itens: [{
      id: "1",
      numero: "123",
      data: "2026-10-10",
      cliente,
      valor: "10,00",
      valorNumerico: 10,
      formaPagamento: "pix" as const,
      motoboy: "Motorista",
      status: "entregue" as const,
    }],
    totais: { quantidade: 1, valorTotal: "10", ticketMedio: "10", porFormaPagamento: [] },
  };
}

describe("exportação CSV do relatório", () => {
  beforeEach(() => {
    vi.mocked(getRelatorioEntregas).mockResolvedValue({
      itens: [{
        id: "1",
        numero: "=1+1",
        data: "+2026-10-10",
        cliente: " -cliente;teste",
        valor: "\t@SUM(A1)",
        valorNumerico: 0,
        formaPagamento: "pix",
        motoboy: "\r-SUM(A1)",
        status: "entregue",
      }],
      totais: { quantidade: 1, valorTotal: "0", ticketMedio: "0", porFormaPagamento: [] },
    });
    vi.mocked(arquivarRelatorioCsv).mockRejectedValue(
      Object.assign(new Error("erro privado"), { code: "EACCES" })
    );
    vi.mocked(obterAdminAutenticado).mockResolvedValue({
      usuarioAdminId: "admin-1",
      colaboradorId: null,
      email: "admin@example.com",
    });
  });

  it("neutraliza fórmulas, usa ponto e vírgula e mantém o download se o arquivo não puder ser arquivado", async () => {
    const erroLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await GET(new NextRequest("http://localhost/relatorios/exportar"));
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(csv).toContain("Código;Data;Cliente;Valor;Forma de pagamento;Motorista;Situação");
    expect(csv).toContain("'=1+1;'+2026-10-10;\"' -cliente;teste\";'\t@SUM(A1);Pix;\"'\r-SUM(A1)\";Entregue");
    expect(arquivarRelatorioCsv).toHaveBeenCalledOnce();
    expect(erroLog).toHaveBeenCalledWith(
      expect.stringMatching(/^\[CSV_ARCHIVE_FAILED\] data_hora=.* usuario=admin%40example\.com motivo=EACCES$/)
    );
    expect(erroLog.mock.calls[0][0]).not.toContain("erro privado");
    erroLog.mockRestore();
  });

  it("escapa delimitadores, aspas e quebras de linha dentro de uma célula", async () => {
    vi.mocked(getRelatorioEntregas).mockResolvedValueOnce({
      itens: [{
        id: "1",
        numero: "123",
        data: "2026-10-10",
        cliente: 'Cliente; "Especial"\r\nRua 2',
        valor: "10,00",
        valorNumerico: 10,
        formaPagamento: "pix",
        motoboy: "Motorista",
        status: "entregue",
      }],
      totais: { quantidade: 1, valorTotal: "10", ticketMedio: "10", porFormaPagamento: [] },
    });

    const response = await GET(new NextRequest("http://localhost/relatorios/exportar"));
    const csv = await response.text();

    expect(csv).toContain('"Cliente; ""Especial""\r\nRua 2"');
  });

  it.each(
    (["\t", "\r", " "] as const).flatMap((prefixo) =>
      (["=", "+", "-", "@"] as const).map((formula) => [prefixo, formula] as const)
    )
  )("neutraliza o nome do cliente iniciado por %j antes de %s", async (prefixo, formula) => {
    const cliente = `${prefixo}${formula}1+1`;
    vi.mocked(getRelatorioEntregas).mockResolvedValueOnce(relatorioComCliente(cliente));

    const response = await GET(new NextRequest("http://localhost/relatorios/exportar"));
    const csv = await response.text();
    const celulaEsperada = `${prefixo === "\r" ? '"' : ""}'${cliente}${prefixo === "\r" ? '"' : ""}`;

    expect(csv).toContain(`;${celulaEsperada};`);
  });

  it("envolve em aspas um nome de cliente com CR isolado", async () => {
    vi.mocked(getRelatorioEntregas).mockResolvedValueOnce(relatorioComCliente("Cliente\rNome"));

    const response = await GET(new NextRequest("http://localhost/relatorios/exportar"));
    const csv = await response.text();

    expect(csv).toContain(';"Cliente\rNome";');
  });
});
