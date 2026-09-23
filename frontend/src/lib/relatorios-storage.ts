import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export function diretorioRaizRelatorios(): string {
  const configurado = process.env.CANHOTO_RELATORIOS_DIR?.trim();
  if (configurado) return path.resolve(configurado);

  return path.resolve(process.cwd(), "..", "storage", "relatorios");
}

function timestampArquivo(): string {
  const agora = new Date();
  const data = [
    agora.getFullYear(),
    String(agora.getMonth() + 1).padStart(2, "0"),
    String(agora.getDate()).padStart(2, "0"),
  ].join("");
  const hora = [
    String(agora.getHours()).padStart(2, "0"),
    String(agora.getMinutes()).padStart(2, "0"),
    String(agora.getSeconds()).padStart(2, "0"),
  ].join("");

  return `${data}-${hora}`;
}

function nomeSeguro(nomeBase: string): string {
  return nomeBase
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export async function arquivarRelatorioCsv(
  nomeBase: string,
  csv: string
): Promise<{ caminho: string; nomeArquivo: string }> {
  const diretorio = diretorioRaizRelatorios();
  await mkdir(diretorio, { recursive: true });

  const base = nomeSeguro(nomeBase) || "relatorio";
  const nomeArquivo = `${base}_${timestampArquivo()}_${randomUUID().slice(0, 8)}.csv`;
  const caminho = path.join(diretorio, nomeArquivo);

  await writeFile(caminho, csv, {
    encoding: "utf8",
    flag: "wx",
  });

  return { caminho, nomeArquivo };
}
