import { SkeletonTopbar, SkeletonKpiGrid, SkeletonTableCard } from '@/components/Skeletons';

export default function AccountsLoading() {
  return (
    <div>
      <SkeletonTopbar />
      <SkeletonKpiGrid count={2} />
      <SkeletonTableCard rows={5} cols={4} />
    </div>
  );
}
