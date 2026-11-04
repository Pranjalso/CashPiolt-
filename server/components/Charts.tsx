'use client';
import { inr } from '@/lib/client';

const short = (v: number) => {
  const a = Math.abs(v), s = v < 0 ? '−' : '';
  return a >= 1e7
    ? `${s}${(a / 1e7).toFixed(1)}Cr`
    : a >= 1e5
    ? `${s}${(a / 1e5).toFixed(1)}L`
    : a >= 1e3
    ? `${s}${(a / 1e3).toFixed(0)}k`
    : `${s}${a.toFixed(0)}`;
};

/** Grouped bars: inflow vs outflow per month, with polished modern aesthetics */
export function InOutBars({
  data,
}: {
  data: { label: string; inflow: number; outflow: number; net: number }[];
}) {
  const W = 680,
    H = 260,
    padLeft = 52,
    padRight = 20,
    padTop = 38,
    chartH = 160,
    baseY = padTop + chartH; // 198

  const maxVal = Math.max(1, ...data.flatMap((d) => [d.inflow, d.outflow]));
  // Round max up slightly so bars don't touch the top grid line
  const max = Math.ceil((maxVal * 1.1) / 100000) * 100000 || maxVal * 1.1;

  const totalPlotWidth = W - padLeft - padRight;
  const groupWidth = totalPlotWidth / Math.max(data.length, 1);
  const barWidth = Math.min(20, Math.max(12, groupWidth * 0.24));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: 'block', overflow: 'visible', fontFamily: 'inherit' }}
      role="img"
      aria-label="Monthly inflow and outflow"
    >
      <defs>
        <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
        <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* Legend Top-Right */}
      <g transform={`translate(${W - 170}, 8)`} fontSize="12" fontWeight="600">
        <rect x="0" y="0" width="10" height="10" rx="3" fill="url(#inflowGrad)" />
        <text x="16" y="9.5" fill="#475569">Inflow</text>

        <rect x="80" y="0" width="10" height="10" rx="3" fill="url(#outflowGrad)" />
        <text x="96" y="9.5" fill="#475569">Outflow</text>
      </g>

      {/* Horizontal Gridlines & Y-Axis values */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = baseY - f * chartH;
        return (
          <g key={f}>
            <line
              x1={padLeft}
              x2={W - padRight}
              y1={y}
              y2={y}
              stroke="#E2E8F0"
              strokeDasharray={f === 0 ? 'none' : '3 3'}
              strokeWidth={f === 0 ? '1.5' : '1'}
            />
            <text
              x={padLeft - 10}
              y={y + 4}
              fontSize="11"
              fontWeight="500"
              textAnchor="end"
              fill="#94A3B8"
              fontFamily="JetBrains Mono, monospace"
            >
              {short(max * f)}
            </text>
          </g>
        );
      })}

      {/* Grouped Month Bars */}
      {data.map((d, i) => {
        const centerX = padLeft + i * groupWidth + groupWidth / 2;
        const hi = Math.max(3, (d.inflow / max) * chartH);
        const ho = Math.max(3, (d.outflow / max) * chartH);

        const inX = centerX - barWidth - 2.5;
        const outX = centerX + 2.5;

        return (
          <g key={d.label}>
            {/* Hover tooltip area */}
            <title>{`${d.label}\nInflow: ${inr(d.inflow)}\nOutflow: ${inr(d.outflow)}\nNet: ${inr(d.net)}`}</title>

            {/* Inflow Bar */}
            <rect
              x={inX}
              y={baseY - hi}
              width={barWidth}
              height={hi}
              rx="4"
              fill="url(#inflowGrad)"
              filter="url(#softGlow)"
            />

            {/* Outflow Bar */}
            <rect
              x={outX}
              y={baseY - ho}
              width={barWidth}
              height={ho}
              rx="4"
              fill="url(#outflowGrad)"
              filter="url(#softGlow)"
            />

            {/* Month Label */}
            <text
              x={centerX}
              y={baseY + 20}
              fontSize="12"
              fontWeight="600"
              textAnchor="middle"
              fill="#334155"
            >
              {d.label}
            </text>

            {/* Net Amount with soft pill or clean color */}
            <text
              x={centerX}
              y={baseY + 38}
              fontSize="11"
              fontWeight="700"
              textAnchor="middle"
              fill={d.net >= 0 ? '#059669' : '#DC2626'}
              fontFamily="JetBrains Mono, monospace"
            >
              {d.net >= 0 ? '+' : ''}
              {short(d.net)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Projected balance line with low-cash threshold */
export function BalanceLine({
  series,
  threshold,
}: {
  series: { date: string; balance: number }[];
  threshold?: number;
}) {
  if (!series.length) return null;
  const W = 680,
    H = 240,
    P = 48;
  const vals = series.map((s) => s.balance).concat(threshold ? [threshold] : []);
  const min = Math.min(0, ...vals),
    max = Math.max(...vals) * 1.05 || 1;
  const x = (i: number) => P + (i / (series.length - 1 || 1)) * (W - P - 16);
  const y = (v: number) => 20 + (1 - (v - min) / (max - min)) * 165;
  const path = series
    .map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s.balance).toFixed(1)}`)
    .join('');
  const ticks = [
    0,
    Math.floor(series.length / 3),
    Math.floor((2 * series.length) / 3),
    series.length - 1,
  ];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: 'block', overflow: 'visible', fontFamily: 'inherit' }}
      role="img"
      aria-label="Projected cash balance"
    >
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {[0, 0.5, 1].map((f) => {
        const v = min + (max - min) * f;
        return (
          <g key={f}>
            <line x1={P} x2={W - 16} y1={y(v)} y2={y(v)} stroke="#E2E8F0" strokeDasharray="3 3" />
            <text
              x={P - 8}
              y={y(v) + 4}
              fontSize="11"
              fontWeight="500"
              textAnchor="end"
              fill="#94A3B8"
              fontFamily="JetBrains Mono, monospace"
            >
              {short(v)}
            </text>
          </g>
        );
      })}

      {min < 0 && <line x1={P} x2={W - 16} y1={y(0)} y2={y(0)} stroke="#0F172A" strokeWidth="1" />}

      {!!threshold && (
        <>
          <line
            x1={P}
            x2={W - 16}
            y1={y(threshold)}
            y2={y(threshold)}
            stroke="#F59E0B"
            strokeDasharray="5 4"
            strokeWidth="1.5"
          />
          <text x={W - 20} y={y(threshold) - 6} fontSize="11" fontWeight="600" textAnchor="end" fill="#D97706">
            Low-cash alert {short(threshold)}
          </text>
        </>
      )}

      {/* Area gradient under line */}
      <path
        d={`${path}L${x(series.length - 1)},${y(min)}L${x(0)},${y(min)}Z`}
        fill="url(#areaGrad)"
      />
      {/* Crisp smooth line */}
      <path d={path} fill="none" stroke="#4F46E5" strokeWidth="2.8" strokeLinecap="round" />

      {ticks.map((i, k) => (
        <text
          key={i}
          x={x(i)}
          y={H - 12}
          fontSize="11"
          fontWeight="500"
          textAnchor={k === 0 ? 'start' : k === ticks.length - 1 ? 'end' : 'middle'}
          fill="#64748B"
        >
          {new Date(series[i].date + 'T00:00:00').toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
          })}
        </text>
      ))}
    </svg>
  );
}

/** Horizontal category bars */
export function CategoryBars({
  rows,
}: {
  rows: { category: string; color?: string; amount: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.amount)),
    total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      {rows.map((r) => (
        <div key={r.category} style={{ marginBottom: 12 }}>
          <div className="row" style={{ marginBottom: 4 }}>
            <span
              className="dot"
              style={{
                background: r.color ?? '#4F46E5',
                boxShadow: `0 0 8px ${r.color ?? '#4F46E5'}44`,
              }}
            />
            <span style={{ fontWeight: 600, color: '#1E293B', fontSize: 13 }}>{r.category}</span>
            <div className="spacer" />
            <b style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>{inr(r.amount)}</b>
            <span className="muted" style={{ width: 44, textAlign: 'right', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
              {total ? Math.round((r.amount / total) * 100) : 0}%
            </span>
          </div>
          <div className="bar-bg" style={{ height: 7, borderRadius: 99 }}>
            <div
              className="bar"
              style={{
                width: `${(r.amount / max) * 100}%`,
                background: r.color ?? '#4F46E5',
                borderRadius: 99,
              }}
            />
          </div>
        </div>
      ))}
      {!rows.length && <p className="muted">No data for this period</p>}
    </div>
  );
}
