import "server-only";
import { redirect } from "next/navigation";
import { obterSessaoOperador } from "@/lib/sessao-operador";

// Telas de cadastro (Colaboradores, Motoristas, Veículos, Setores,
// Configurações) são só do Admin. gestor_setor volta pro Dashboard; sem
// sessão válida vai pro login. As Server Actions dessas telas já exigem
// admin — isto fecha também a LEITURA dos dados (telefones, PINs, etc.).
export async function exigirAdminNaPagina(): Promise<void> {
  const sessao = await obterSessaoOperador();
  if (!sessao) redirect("/login");
  if (sessao.tipo !== "admin") redirect("/");
}
