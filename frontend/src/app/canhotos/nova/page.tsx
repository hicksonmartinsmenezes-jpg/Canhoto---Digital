import { getMotoboys } from "@/lib/data/motoboys";
import { getClientesRecentes } from "@/lib/data/entregas";
import { obterSessaoOperador, setorIdParaFiltro } from "@/lib/sessao-operador";
import { AdicionarEntregaForm } from "@/components/canhotos/AdicionarEntregaForm";

export const dynamic = "force-dynamic";

export default async function NovaEntregaPage() {
  const sessao = await obterSessaoOperador();
  const [motoboys, clientes] = await Promise.all([
    getMotoboys(),
    getClientesRecentes(setorIdParaFiltro(sessao)),
  ]);
  const agora = new Date();
  const hoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(
    agora.getDate()
  ).padStart(2, "0")}`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Adicionar Entrega</h1>
      </div>

      <AdicionarEntregaForm motoboys={motoboys} clientes={clientes} hoje={hoje} />
    </div>
  );
}
