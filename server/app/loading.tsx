import { Skeleton } from '@/components/Skeletons';

export default function RootLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* Sidebar placeholder */}
      <div style={{ width: 268, background: '#0C193D', padding: '22px 14px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton width={140} height={28} borderRadius={6} style={{ background: 'rgba(255,255,255,0.1)' }} />
        <Skeleton width="100%" height={90} borderRadius={12} style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} width="90%" height={32} borderRadius={8} style={{ background: 'rgba(255,255,255,0.06)' }} />
          ))}
        </div>
      </div>
      {/* Main content placeholder */}
      <div style={{ flex: 1, padding: '28px 36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <Skeleton width={220} height={28} style={{ marginBottom: 8 }} />
            <Skeleton width={320} height={14} />
          </div>
          <Skeleton width={120} height={38} borderRadius={8} />
        </div>
        <div className="grid g4" style={{ marginBottom: 20 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card kpi" style={{ minHeight: 100 }}>
              <Skeleton width="40%" height={12} style={{ marginBottom: 10 }} />
              <Skeleton width="70%" height={26} style={{ marginBottom: 8 }} />
              <Skeleton width="50%" height={11} />
            </div>
          ))}
        </div>
        <div className="card" style={{ height: 320 }} />
      </div>
    </div>
  );
}
