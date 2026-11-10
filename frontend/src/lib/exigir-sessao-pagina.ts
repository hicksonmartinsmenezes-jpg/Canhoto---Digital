import "server-only";
import { redirect } from "next/navigation";
import { obterSessaoOperador } from "@/lib/sessao-operador";

// Telas liberadas para administrador e colaborador (Veículos, Treinamentos):
// sem sessão válida vai pro login.
export async function exigirSessaoNaPagina(): Promise<void> {
  const sessao = await obterSessaoOperador();
  if (!sessao) redirect("/login");
}
