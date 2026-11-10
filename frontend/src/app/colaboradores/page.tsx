import { exigirAdminNaPagina } from "@/lib/exigir-admin-pagina";
import { getColaboradoresList } from "@/lib/data/colaboradores";
import { getUnidades } from "@/lib/data/setores";
import { ColaboradoresManager } from "@/components/colaboradores/ColaboradoresManager";

export const dynamic = "force-dynamic";

export default async function ColaboradoresPage() {
  await exigirAdminNaPagina();
  const [colaboradores, unidades] = await Promise.all([
    getColaboradoresList(),
    getUnidades(),
  ]);

  return <ColaboradoresManager colaboradores={colaboradores} unidades={unidades} />;
}
