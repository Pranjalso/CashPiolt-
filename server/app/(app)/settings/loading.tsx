import { SkeletonTopbar, Skeleton } from '@/components/Skeletons';

export default function SettingsLoading() {
  return (
    <div>
      <SkeletonTopbar />
      <div className="card" style={{ padding: 22, marginBottom: 18 }}>
        <Skeleton width={180} height={20} style={{ marginBottom: 16 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton width={80} height={12} style={{ marginBottom: 6 }} />
              <Skeleton width="100%" height={38} borderRadius={8} />
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 22 }}>
        <Skeleton width={150} height={20} style={{ marginBottom: 16 }} />
        <Skeleton width="100%" height={120} borderRadius={8} />
      </div>
    </div>
  );
}
