import { SkeletonTopbar, SkeletonKpiGrid, SkeletonTableCard } from '@/components/Skeletons';

export default function DuesLoading() {
  return (
    <div>
      <SkeletonTopbar />
      <SkeletonKpiGrid count={3} />
      <SkeletonTableCard rows={7} cols={6} />
    </div>
  );
}
