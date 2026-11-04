import { SkeletonTopbar, Skeleton } from '@/components/Skeletons';

export default function ClaimDetailLoading() {
  return (
    <div>
      <SkeletonTopbar />
      <div className="grid g2">
        <div className="card" style={{ padding: 22 }}>
          <Skeleton width={160} height={20} style={{ marginBottom: 16 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Skeleton width={90} height={14} />
                <Skeleton width={140} height={14} />
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <Skeleton width={140} height={20} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={120} borderRadius={8} />
        </div>
      </div>
    </div>
  );
}
