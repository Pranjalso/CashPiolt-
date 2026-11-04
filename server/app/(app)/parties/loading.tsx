import { SkeletonTopbar, SkeletonTableCard } from '@/components/Skeletons';

export default function PartiesLoading() {
  return (
    <div>
      <SkeletonTopbar />
      <SkeletonTableCard rows={8} cols={5} />
    </div>
  );
}
