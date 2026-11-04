import { SkeletonTopbar, SkeletonKpiGrid, SkeletonTableCard } from '@/components/Skeletons';

export default function BudgetsLoading() {
  return (
    <div>
      <SkeletonTopbar />
      <SkeletonKpiGrid count={2} />
      <SkeletonTableCard rows={6} cols={5} />
    </div>
  );
}
