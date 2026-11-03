import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requirePage } from '@/lib/auth';
import { dashboard } from '@/lib/services/reports';
import { InOutBars } from '@/components/Charts';
import QuickAdd from '@/components/QuickAdd';

const inr = (v: number) => (v < 0 ? '−₹' : '₹') + Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const d = (v: string) => new Date(v + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

export default async function Dashboard() {
  const s = await requirePage();
  if (s.role === 'EMPLOYEE') redirect('/claims');
  const x = await dashboard(s.orgId);
  const low = x.business!.low_cash_alert;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>{x.business!.name}</h1>
          <span className="muted">{x.business!.business_type.replace('_', ' / ')} · Cash position as of today</span>
        </div>
        {s.role !== 'VIEWER' && <QuickAdd />}
      </div>

      {x.forecast.low_cash_date && (
        <div className="warn">
          ⚠ Cash is projected to fall below your alert level of {inr(low)} on <b>{d(x.forecast.low_cash_date)}</b>.{' '}
          <Link href="/reports">See forecast →</Link>
        </div>
      )}
      {x.dues.overdue_receivable > 0 && (
        <div className="warn">
          {inr(x.dues.overdue_receivable)} of customer payments are overdue.{' '}
          <Link href="/dues?kind=RECEIVABLE">Follow up →</Link>
        </div>
      )}

      <div className="grid g4">
        <div className="card kpi">
          <div className="label">Cash & bank balance</div>
          <div className="val">{inr(x.total_balance)}</div>
          <div className="sub">{x.balances.length} accounts</div>
        </div>
        <div className="card kpi">
          <div className="label">This month: in / out</div>
          <div className="val"><span className="in">{inr(x.month.inflow)}</span></div>
          <div className="sub">
            Out {inr(x.month.outflow)} · Net <b className={x.month.net >= 0 ? 'in' : 'out'}>{inr(x.month.net)}</b>
          </div>
        </div>
        <div className="card kpi">
          <div className="label">To receive</div>
          <div className="val">{inr(x.dues.receivable)}</div>
          <div className="sub">Overdue <b className="out">{inr(x.dues.overdue_receivable)}</b></div>
        </div>
        <div className="card kpi">
          <div className="label">To pay</div>
          <div className="val">{inr(x.dues.payable)}</div>
          <div className="sub">Overdue <b className="out">{inr(x.dues.overdue_payable)}</b></div>
        </div>
        <div className="card kpi">
          <div className="label">Balance in 30 days (forecast)</div>
          <div className="val">{inr(x.forecast.end_balance)}</div>
          <div className="sub">Lowest {inr(x.forecast.min_balance)} on {d(x.forecast.min_date)}</div>
        </div>
        <Link href="/claims" className="card kpi" style={{ color: 'inherit' }}>
          <div className="label">Expense claims</div>
          <div className="val">{x.claims.to_review} to review</div>
          <div className="sub">{x.claims.to_pay} approved · {inr(x.claims.to_pay_amount)} to reimburse</div>
        </Link>
      </div>

      <div className="grid g2">
        <div className="card">
          <h3>Monthly cash flow</h3>
          <InOutBars data={x.monthly} />
        </div>
        <div className="card" style={{ padding: 0 }}>
          <h3 style={{ padding: '16px 16px 8px', margin: 0 }}>Account balances</h3>
          <div className="table-wrap">
            <table>
              <tbody>
                {x.balances.map(b => (
                  <tr key={b.account_id}>
                    <td>
                      <b>{b.name}</b>
                      <div className="muted" style={{ fontSize: 11 }}>{b.type.replace('_', ' ')}</div>
                    </td>
                    <td className={`num ${b.balance < 0 ? 'out' : ''}`}>
                      <b>{inr(b.balance)}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid g2">
        <div className="card" style={{ padding: 0 }}>
          <h3 style={{ padding: '16px 16px 8px', margin: 0 }}>Upcoming & overdue dues</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Due</th>
                  <th>Party</th>
                  <th>Doc</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {x.upcoming.map(u => (
                  <tr key={u.id}>
                    <td>
                      {d(u.due_date)} {u.days_overdue > 0 && <span className="badge s-OVERDUE">{u.days_overdue}d late</span>}
                    </td>
                    <td>{u.party_name ?? '—'}</td>
                    <td>{u.doc_no}</td>
                    <td className={`num ${u.kind === 'RECEIVABLE' ? 'in' : 'out'}`}>
                      {u.kind === 'RECEIVABLE' ? '+' : '−'}{inr(u.outstanding)}
                    </td>
                  </tr>
                ))}
                {!x.upcoming.length && <tr><td colSpan={4} className="muted" style={{ padding: 14 }}>Nothing due</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>Budget vs actual — this month</h3>
          {x.budgets.map(b => {
            const pct = b.budget ? (b.actual / b.budget) * 100 : 0;
            return (
              <div key={b.category_id} style={{ marginBottom: 10 }}>
                <div className="row">
                  <span className="dot" style={{ background: b.color }} />
                  {b.category}
                  <div className="spacer" />
                  <span className={pct > 100 ? 'out' : ''}>{inr(b.actual)}</span>
                  <span className="muted">/ {inr(b.budget)}</span>
                </div>
                <div className="bar-bg">
                  <div
                    className="bar"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      background: pct > 100 ? '#dc2626' : pct > 80 ? '#d97706' : '#12b39a',
                    }}
                  />
                </div>
              </div>
            );
          })}
          {!x.budgets.length && (
            <p className="muted">
              No budgets set. <Link href="/budgets">Set budgets →</Link>
            </p>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <h3 style={{ padding: '16px 16px 8px', margin: 0 }}>Recent entries</h3>
        <div className="table-wrap">
          <table>
            <tbody>
              {x.recent.map(r => (
                <tr key={r.id}>
                  <td style={{ width: 110 }}>{d(r.txn_date)}</td>
                  <td>
                    {r.transfer_group ? (
                      '⇄ Transfer'
                    ) : (
                      <>
                        <span className="dot" style={{ background: r.color ?? '#999' }} />
                        {r.category ?? 'Settlement'}
                      </>
                    )}
                  </td>
                  <td>{r.party ?? ''}</td>
                  <td className="muted">{r.account}</td>
                  <td className={`num ${r.direction === 'IN' ? 'in' : 'out'}`}>
                    {r.direction === 'IN' ? '+' : '−'}{inr(r.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 12 }}>
          <Link href="/transactions">All transactions →</Link>
        </div>
      </div>
    </>
  );
}
