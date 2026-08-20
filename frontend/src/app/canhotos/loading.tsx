import { SkeletonPageHeader, SkeletonTable } from "@/components/ui/Skeleton";

// Skeleton da listagem de Entregas — a página busca `getEntregas()` no
// Supabase a cada request (`force-dynamic`), então esse fallback do
// `loading.tsx` do Next.js cobre tanto o carregamento inicial quanto a
// navegação vindo de outra rota do Portal Web Admin.
export default function CanhotosLoading() {
  return (
    <div>
      <SkeletonPageHeader />
      <SkeletonTable columns={10} rows={7} />
    </div>
  );
}
