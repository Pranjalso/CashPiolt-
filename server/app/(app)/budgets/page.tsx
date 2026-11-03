'use client';
import { useEffect, useState } from 'react';
import { Msg } from '@/components/ui';
import { apiCall, inr2, todayStr, useData } from '@/lib/client';

export default function Budgets() {
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const { data, reload } = useData<any[]>(`/api/budgets?month=${month}`);
  const { data: lk } = useData<any>('/api/lookups');
  const [vals, setVals] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setVals(Object.fromEntries((data ?? []).map(b => [b.category_id, String(b.budget)])));
  }, [data]);

  const actual = (id: number) => data?.find(b => b.category_id === id)?.actual ?? 0;

  async function save() {
    setErr('');
    setMsg('');

    // Validate inputs
    for (const [catId, valStr] of Object.entries(vals)) {
      if (valStr !== '' && valStr != null) {
        const val = Number(valStr);
        if (isNaN(val) || val < 0) {
          setErr('Budget amounts must be valid non-negative numbers.');
          return;
        }
      }
    }

    setBusy(true);
    try {
      await apiCall('/api/budgets', 'POST', {
        month,
        items: Object.entries(vals).map(([k, v]) => ({
          category_id: Number(k),
          amount: Math.max(0, Number(v || 0)),
        })),
      });
      setMsg('Budgets saved successfully');
      reload();
    } catch (x: any) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  }

  const exp = (lk?.categories ?? []).filter((c: any) => c.direction === 'OUT');
  const tb = Object.values(vals).reduce((s, v) => s + Number(v || 0), 0);
  const ta = (data ?? []).reduce((s, b) => s + b.actual, 0);

  return (
    <>
      <div className="topbar">
        <h1>Monthly budgets</h1>
        <div className="row">
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{ width: 170 }}
          />
          <button className="btn primary" disabled={busy} onClick={save}>
            {busy ? 'Saving…' : 'Save budgets'}
          </button>
        </div>
      </div>

      <Msg err={err} ok={msg} />

      <div className="grid g4">
        <div className="card kpi">
          <div className="label">Total budget</div>
          <div className="val">{inr2(tb)}</div>
        </div>
        <div className="card kpi">
          <div className="label">Spent (budgeted categories)</div>
          <div className={`val ${ta > tb ? 'out' : ''}`}>{inr2(ta)}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Expense category</th>
                <th style={{ width: 170 }}>Budget (₹)</th>
                <th className="num">Actual</th>
                <th style={{ width: '30%' }}>Usage</th>
              </tr>
            </thead>
            <tbody>
              {exp.map((c: any) => {
                const b = Number(vals[c.id] || 0);
                const a = actual(c.id);
                const pct = b ? (a / b) * 100 : 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <span className="dot" style={{ background: c.color }} />
                      {c.name}
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={vals[c.id] ?? ''}
                        placeholder="no budget"
                        onChange={e => setVals({ ...vals, [c.id]: e.target.value })}
                      />
                    </td>
                    <td className="num">{b ? inr2(a) : <span className="muted">—</span>}</td>
                    <td>
                      {b > 0 && (
                        <div className="row">
                          <div className="bar-bg" style={{ flex: 1 }}>
                            <div
                              className="bar"
                              style={{
                                width: `${Math.min(pct, 100)}%`,
                                background: pct > 100 ? '#dc2626' : pct > 80 ? '#d97706' : '#12b39a',
                              }}
                            />
                          </div>
                          <span
                            className={pct > 100 ? 'out' : 'muted'}
                            style={{ width: 44, textAlign: 'right' }}
                          >
                            {Math.round(pct)}%
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!exp.length && (
                <tr><td colSpan={4} className="muted" style={{ padding: 14 }}>No expense categories configured</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="muted">
        Budgets are only tracked for categories that have one. Set an amount to 0 or leave empty to clear.
      </p>
    </>
  );
}
