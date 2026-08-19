import { getMotoboysList } from "@/lib/data/motoboys";
import { MotoboysManager } from "@/components/motoboys/MotoboysManager";

export const dynamic = "force-dynamic";

export default async function MotoboysPage() {
  const motoboys = await getMotoboysList();

  return <MotoboysManager motoboys={motoboys} />;
}
