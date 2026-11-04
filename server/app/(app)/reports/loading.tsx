import { SkeletonTopbar, SkeletonKpiGrid, SkeletonTableCard } from '@/components/Skeletons';

export default function ReportsLoading() {
  return (
    <div>
      <SkeletonTopbar />
      <SkeletonKpiGrid count={3} />
      <SkeletonTableCard rows={6} cols={5} />
    </div>
  );
}
