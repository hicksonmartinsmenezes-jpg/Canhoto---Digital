import { exigirSessaoNaPagina } from "@/lib/exigir-sessao-pagina";
import { VeiculosManager } from "@/components/veiculos/VeiculosManager";
import { getVeiculosData } from "@/lib/data/veiculos";

export const dynamic = "force-dynamic";

export default async function VeiculosPage() {
  await exigirSessaoNaPagina();
  const data = await getVeiculosData();

  return <VeiculosManager data={data} />;
}
