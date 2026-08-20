import { SkeletonPageHeader, SkeletonTable } from "@/components/ui/Skeleton";

// Skeleton da listagem de Motoristas — mesma lógica do loading.tsx de
// Entregas: `getMotoboysList()` busca no Supabase a cada request.
export default function MotoboysLoading() {
  return (
    <div>
      <SkeletonPageHeader />
      <SkeletonTable columns={4} rows={6} />
    </div>
  );
}
