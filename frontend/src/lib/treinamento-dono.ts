import "server-only";

import { obterOperadorAutenticado } from "@/lib/operador-auth";
import type { DonoTreinamento } from "@/lib/data/treinamentos";

// Quem está fazendo o treinamento: o usuário Admin ou o colaborador logado.
// null = sem sessão válida.
export async function obterDonoTreinamento(): Promise<DonoTreinamento | null> {
  const operador = await obterOperadorAutenticado();
  if (!operador) return null;
  return operador.tipo === "admin"
    ? { usuarioAdminId: operador.usuarioAdminId }
    : { colaboradorId: operador.colaboradorId };
}
