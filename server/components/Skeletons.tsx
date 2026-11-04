export function Skeleton({
  width,
  height,
  borderRadius = 8,
  className = '',
  style = {},
}: {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`skeleton-pulse ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? 16,
        borderRadius,
        ...style,
      }}
    />
  );
}

export function SkeletonTopbar() {
  return (
    <div className="topbar" style={{ marginBottom: 22 }}>
      <div>
        <Skeleton width={220} height={28} style={{ marginBottom: 8 }} />
        <Skeleton width={320} height={14} />
      </div>
      <Skeleton width={110} height={36} borderRadius={9} />
    </div>
  );
}

export function SkeletonKpiGrid({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid ${count === 6 ? 'g4' : count === 3 ? 'g3' : 'g4'}`} style={{ marginBottom: 18 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card kpi" style={{ minHeight: 96, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Skeleton width="45%" height={12} style={{ marginBottom: 8 }} />
          <Skeleton width="70%" height={26} style={{ marginBottom: 8 }} />
          <Skeleton width="55%" height={11} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTableCard({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={160} height={18} />
        <Skeleton width={80} height={28} borderRadius={6} />
      </div>
      <div style={{ padding: '12px 18px' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14, paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} width="60%" height={12} />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: 14,
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: r === rows - 1 ? 'none' : '1px solid #f1f5f9',
            }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                width={c === 0 ? '80%' : c === cols - 1 ? '40%' : '65%'}
                height={14}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonSplitCards() {
  return (
    <div className="grid g2" style={{ marginBottom: 18 }}>
      <div className="card" style={{ minHeight: 280, padding: 20 }}>
        <Skeleton width={180} height={18} style={{ marginBottom: 16 }} />
        <Skeleton width="100%" height={200} borderRadius={10} />
      </div>
      <div className="card" style={{ minHeight: 280, padding: 20 }}>
        <Skeleton width={160} height={18} style={{ marginBottom: 16 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Skeleton width={120} height={13} />
                <Skeleton width={70} height={13} />
              </div>
              <Skeleton width="100%" height={8} borderRadius={4} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Standard full-page dashboard skeleton */
export default function PageSkeleton() {
  return (
    <div style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
      <SkeletonTopbar />
      <SkeletonKpiGrid count={6} />
      <SkeletonSplitCards />
      <SkeletonTableCard rows={5} cols={5} />
    </div>
  );
}
