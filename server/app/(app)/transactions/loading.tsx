import { SkeletonTopbar, SkeletonKpiGrid, SkeletonTableCard } from '@/components/Skeletons';

export default function TransactionsLoading() {
  return (
    <div>
      <SkeletonTopbar />
      <SkeletonKpiGrid count={3} />
      <SkeletonTableCard rows={8} cols={6} />
    </div>
  );
}
