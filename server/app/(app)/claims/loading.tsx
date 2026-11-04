import { SkeletonTopbar, SkeletonKpiGrid, SkeletonTableCard } from '@/components/Skeletons';

export default function ClaimsLoading() {
  return (
    <div>
      <SkeletonTopbar />
      <SkeletonKpiGrid count={3} />
      <SkeletonTableCard rows={6} cols={6} />
    </div>
  );
}
