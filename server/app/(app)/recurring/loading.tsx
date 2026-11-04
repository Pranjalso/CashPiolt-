import { SkeletonTopbar, SkeletonKpiGrid, SkeletonTableCard } from '@/components/Skeletons';

export default function RecurringLoading() {
  return (
    <div>
      <SkeletonTopbar />
      <SkeletonKpiGrid count={2} />
      <SkeletonTableCard rows={5} cols={6} />
    </div>
  );
}
