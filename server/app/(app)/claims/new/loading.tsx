import { SkeletonTopbar, Skeleton } from '@/components/Skeletons';

export default function NewClaimLoading() {
  return (
    <div>
      <SkeletonTopbar />
      <div className="card" style={{ maxWidth: 640, padding: 24, margin: '0 auto' }}>
        <Skeleton width={180} height={22} style={{ marginBottom: 18 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <Skeleton width={100} height={12} style={{ marginBottom: 6 }} />
              <Skeleton width="100%" height={38} borderRadius={8} />
            </div>
          ))}
          <Skeleton width={140} height={40} borderRadius={8} style={{ marginTop: 8 }} />
        </div>
      </div>
    </div>
  );
}
