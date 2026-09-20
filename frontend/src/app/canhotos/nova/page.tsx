import { getMotoboys } from "@/lib/data/motoboys";
import { AdicionarEntregaWizard } from "@/components/canhotos/AdicionarEntregaWizard";

export const dynamic = "force-dynamic";

export default async function NovaEntregaPage() {
  const motoboys = await getMotoboys();
  const agora = new Date();
  const hoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(
    agora.getDate()
  ).padStart(2, "0")}`;

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight">Adicionar Entrega</h1>
      </div>

      <AdicionarEntregaWizard motoboys={motoboys} hoje={hoje} />
    </div>
  );
}
