import { getMotoboys } from "@/lib/data/motoboys";
import { AdicionarEntregaWizard } from "@/components/canhotos/AdicionarEntregaWizard";

export const dynamic = "force-dynamic";

export default async function NovaEntregaPage() {
  const motoboys = await getMotoboys();
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight">Adicionar Entrega</h1>
      </div>

      <AdicionarEntregaWizard motoboys={motoboys} hoje={hoje} />
    </div>
  );
}
