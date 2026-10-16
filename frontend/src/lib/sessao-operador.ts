import "server-only";

// Helper único pras páginas do Portal descobrirem quem está logado sem se
// importar se é Admin (vê tudo) ou colaborador com papel "gestor_setor"
// (vê só o setor dele). A sessão é REVALIDADA no banco a cada chamada
// (colaborador ainda ativo, ainda gestor_setor, setor atual) — o token do
// cookie vale por 8 h e não pode ser a fonte da verdade sobre o setor.

import { authBypassAtivo } from "@/lib/auth-bypass";
import { obterOperadorAutenticado } from "@/lib/operador-auth";
import type { SessaoOperador } from "@/lib/sessao-operador-core";

export {
  sessaoPodeAcessarSetor,
  setorIdParaFiltro,
  type SessaoOperador,
} from "@/lib/sessao-operador-core";

export async function obterSessaoOperador(): Promise<SessaoOperador | null> {
  const operador = await obterOperadorAutenticado();

  if (operador?.tipo === "admin") {
    return { tipo: "admin", usuarioAdminId: operador.usuarioAdminId };
  }

  if (operador?.tipo === "gestor_setor") {
    return {
      tipo: "gestor_setor",
      colaboradorId: operador.colaboradorId,
      setorId: operador.setorId,
    };
  }

  // CI/dev: o proxy já liberou a rota sem sessão; trata como admin para
  // as telas continuarem mostrando dados. Nunca vale em produção.
  if (authBypassAtivo()) {
    return { tipo: "admin", usuarioAdminId: "auth-bypass" };
  }

  return null;
}
