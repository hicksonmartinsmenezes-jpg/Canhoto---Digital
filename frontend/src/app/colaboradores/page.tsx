import { exigirAdminNaPagina } from "@/lib/exigir-admin-pagina";
import { getColaboradoresList } from "@/lib/data/colaboradores";
import { ColaboradoresManager } from "@/components/colaboradores/ColaboradoresManager";

export const dynamic = "force-dynamic";

export default async function ColaboradoresPage() {
  await exigirAdminNaPagina();
  const colaboradores = await getColaboradoresList();

  return <ColaboradoresManager colaboradores={colaboradores} />;
}
