import { SkeletonTopbar, SkeletonTableCard } from '@/components/Skeletons';

export default function CategoriesLoading() {
  return (
    <div>
      <SkeletonTopbar />
      <SkeletonTableCard rows={8} cols={4} />
    </div>
  );
}
