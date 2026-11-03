'use client';
import { useState } from 'react';
import { BalanceLine, CategoryBars } from '@/components/Charts';
import { fmtDate, inr, inr2, monthStart, todayStr, useData } from '@/lib/client';

function Section({ title, a }: { title: string; a: any }) {
  return (
    <>
      <tr>
        <th colSpan={2} style={{ background: '#eef0f7', color: '#0B1F4B' }}>{title}</th>
      </tr>
      {a.lines.map((l: any) => (
        <tr key={l.direction + l.category}>
          <td style={{ paddingLeft: 24 }}>
            {l.direction === 'IN' ? 'Received: ' : 'Paid: '}
            {l.category} <span className="muted">({l.count})</span>
          </td>
          <td className={`num ${l.direction === 'IN' ? 'in' : 'out'}`}>
            {l.direction === 'IN' ? '' : '('}
            {inr2(l.amount)}
            {l.direction === 'IN' ? '' : ')'}
          </td>
        </tr>
      ))}
      {!a.lines.length && (
        <tr>
          <td style={{ paddingLeft: 24 }} className="muted" colSpan={2}>
            No activity
          </td>
        </tr>
      )}
      <tr>
        <td><b>Net cash from {title.toLowerCase()}</b></td>
        <td className={`num ${a.net >= 0 ? 'in' : 'out'}`}>
          <b>{inr2(a.net)}</b>
        </td>
      </tr>
    </>
  );
}

export default function Reports() {
  const [tab, setTab] = useState<'forecast' | 'statement' | 'breakdown' | 'daybook'>('forecast');
  const [days, setDays] = useState(90);
  const [trend, setTrend] = useState(true);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [dir, setDir] = useState<'OUT' | 'IN'>('OUT');
  const [daybookDate, setDaybookDate] = useState(todayStr());

  const { data: fc } = useData<any>(tab === 'forecast' ? `/api/reports/forecast?days=${days}&trend=${trend ? 1 : 0}` : null);
  const { data: st } = useData<any>(tab === 'statement' ? `/api/reports/statement?from=${from}&to=${to}` : null);
  const { data: br } = useData<any[]>(tab === 'breakdown' ? `/api/reports/breakdown?from=${from}&to=${to}&direction=${dir}` : null);
  const { data: db } = useData<any[]>(tab === 'daybook' ? `/api/reports/daybook?date=${daybookDate}` : null);

  return (
    <>
      <div className="topbar">
        <h1>Reports & forecast</h1>
        <div className="row no-print">
          <div className="tabs">
            {([
              ['forecast', 'Cash forecast'],
              ['statement', 'Cash flow statement'],
              ['breakdown', 'Where money goes'],
              ['daybook', 'Day book'],
            ] as const).map(([k, l]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                {l}
              </button>
            ))}
          </div>
          <button className="btn" onClick={() => print()}>Print</button>
        </div>
      </div>

      {['statement', 'breakdown'].includes(tab) && (
        <div className="card row no-print">
          <label style={{ margin: 0 }}>From</label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            style={{ width: 170 }}
          />
          <label style={{ margin: 0 }}>To</label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            style={{ width: 170 }}
          />
          {tab === 'breakdown' && (
            <select
              value={dir}
              onChange={e => setDir(e.target.value as any)}
              style={{ width: 160 }}
            >
              <option value="OUT">Money out</option>
              <option value="IN">Money in</option>
            </select>
          )}
        </div>
      )}

      {tab === 'daybook' && (
        <div className="card row no-print">
          <label style={{ margin: 0 }}>Date</label>
          <input
            type="date"
            value={daybookDate}
            onChange={e => setDaybookDate(e.target.value)}
            style={{ width: 170 }}
          />
        </div>
      )}

      {tab === 'forecast' && fc && (
        <>
          <div className="card row no-print">
            <label style={{ margin: 0 }}>Horizon</label>
            {[30, 60, 90, 180].map(d => (
              <button
                key={d}
                className={`btn sm ${days === d ? 'primary' : ''}`}
                onClick={() => setDays(d)}
              >
                {d} days
              </button>
            ))}
            <label className="row" style={{ margin: '0 0 0 16px' }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={trend}
                onChange={e => setTrend(e.target.checked)}
              />{' '}
              Include day-to-day trend ({inr(fc.daily_trend)}/day)
            </label>
          </div>

          {fc.low_cash_date && (
            <div className="warn">
              ⚠ Balance drops below your alert level ({inr(fc.low_cash_alert)}) on{' '}
              <b>{fmtDate(fc.low_cash_date)}</b>.
            </div>
          )}

          <div className="grid g4">
            <div className="card kpi">
              <div className="label">Today</div>
              <div className="val">{inr(fc.start_balance)}</div>
            </div>
            <div className="card kpi">
              <div className="label">In {days} days</div>
              <div className={`val ${fc.end_balance < 0 ? 'out' : ''}`}>{inr(fc.end_balance)}</div>
            </div>
            <div className="card kpi">
              <div className="label">Lowest point</div>
              <div className={`val ${fc.min_balance < 0 ? 'out' : ''}`}>{inr(fc.min_balance)}</div>
              <div className="sub">on {fmtDate(fc.min_date)}</div>
            </div>
          </div>

          <div className="card">
            <h3>Projected cash balance</h3>
            <BalanceLine series={fc.series} threshold={fc.low_cash_alert} />
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Expected event</th>
                    <th>Source</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {fc.events.map((e: any, i: number) => (
                    <tr key={i}>
                      <td>{fmtDate(e.date)}</td>
                      <td>{e.label}</td>
                      <td><span className="badge">{e.type}</span></td>
                      <td className={`num ${e.amount >= 0 ? 'in' : 'out'}`}>
                        {e.amount >= 0 ? '+' : ''}{inr2(e.amount)}
                      </td>
                    </tr>
                  ))}
                  {!fc.events.length && (
                    <tr><td colSpan={4} className="muted" style={{ padding: 14 }}>No upcoming dues or recurring events within this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="muted">
            Forecast = today’s balance + open invoices on due date (overdue ones assumed collected within 7 days) − open bills on due date (overdue assumed paid today) ± recurring entries + average daily ad-hoc cash from the last 90 days.
          </p>
        </>
      )}

      {tab === 'statement' && st && (
        <div className="card" style={{ maxWidth: 760, padding: 0 }}>
          <h3 style={{ padding: '16px 16px 8px', margin: 0 }}>Cash flow statement · {fmtDate(st.from)} – {fmtDate(st.to)}</h3>
          <div className="table-wrap">
            <table>
              <tbody>
                <tr>
                  <td><b>Opening cash & bank balance</b></td>
                  <td className="num"><b>{inr2(st.opening)}</b></td>
                </tr>
                {st.new_accounts !== 0 && (
                  <tr>
                    <td>Opening balance of accounts added in period</td>
                    <td className="num">{inr2(st.new_accounts)}</td>
                  </tr>
                )}
                <Section title="Operating activities" a={st.operating} />
                <Section title="Investing activities" a={st.investing} />
                <Section title="Financing activities" a={st.financing} />
                <tr>
                  <td><b>Net increase / (decrease) in cash</b></td>
                  <td className={`num ${st.net >= 0 ? 'in' : 'out'}`}><b>{inr2(st.net)}</b></td>
                </tr>
                <tr style={{ background: '#0B1F4B', color: '#fff' }}>
                  <td><b>Closing cash & bank balance</b></td>
                  <td className="num"><b>{inr2(st.closing)}</b></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'breakdown' && br && (
        <div className="card" style={{ maxWidth: 760 }}>
          <h3>{dir === 'OUT' ? 'Money out' : 'Money in'} by category</h3>
          <CategoryBars rows={br} />
        </div>
      )}

      {tab === 'daybook' && db && (
        <div className="card" style={{ maxWidth: 900, padding: 0 }}>
          <div className="row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0 }}>Day book · {fmtDate(daybookDate)}</h3>
            <div className="spacer" />
            <span className="muted">{db.length} entries</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time / ID</th>
                  <th>Type</th>
                  <th>Category / Party</th>
                  <th>Account</th>
                  <th>Mode</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {db.map((t: any) => (
                  <tr key={t.id}>
                    <td>#{t.id}</td>
                    <td>
                      <span className={`badge ${t.direction === 'IN' ? 's-PAID' : 's-OVERDUE'}`}>
                        {t.direction === 'IN' ? 'Money in' : 'Money out'}
                      </span>
                    </td>
                    <td>
                      <div><b>{t.category ?? '—'}</b></div>
                      {t.party && <div className="muted" style={{ fontSize: 11 }}>{t.party}</div>}
                    </td>
                    <td>{t.account}</td>
                    <td>{t.payment_mode}{t.reference ? ` (${t.reference})` : ''}</td>
                    <td className={`num ${t.direction === 'IN' ? 'in' : 'out'}`}>
                      <b>{t.direction === 'IN' ? '+' : '−'}{inr2(t.amount)}</b>
                    </td>
                  </tr>
                ))}
                {!db.length && (
                  <tr>
                    <td colSpan={6} className="muted" style={{ padding: 16 }}>
                      No transactions recorded for this day
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
