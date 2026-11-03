'use client';
import { useState } from 'react';
import TxnForm from '@/components/TxnForm';
import { ConfirmModal, Msg } from '@/components/ui';
import { apiCall, fmtDate, inr2, monthStart, todayStr, useData } from '@/lib/client';

export default function Transactions() {
  const [f, setF] = useState<any>({ from: monthStart(), to: todayStr(), page: 1 });
  const qs = new URLSearchParams(
    Object.entries(f)
      .filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => [k, String(v)])
  );
  const { data, error, reload } = useData<any>(`/api/transactions?${qs}`);
  const { data: lk } = useData<any>('/api/lookups');
  const [form, setForm] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [err, setErr] = useState('');

  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value, page: 1 });

  const csv = () => {
    if (!data?.rows) return;
    const rows = [
      ['Date', 'Type', 'Category', 'Party', 'Account', 'Mode', 'Reference', 'Notes', 'Amount'],
      ...data.rows.map((r: any) => [
        r.txn_date,
        r.transfer_group ? 'TRANSFER' : r.direction,
        r.category ?? '',
        r.party ?? '',
        r.account,
        r.payment_mode,
        r.reference ?? '',
        r.notes ?? '',
        (r.direction === 'IN' ? 1 : -1) * r.amount,
      ]),
    ];
    const blob = new Blob(
      [rows.map((r: any[]) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')],
      { type: 'text/csv;charset=utf-8;' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cashbook_${f.from}_${f.to}.csv`;
    a.click();
  };

  async function executeDelete(r: any) {
    try {
      await apiCall(`/api/transactions/${r.id}`, 'DELETE');
      setDeleteTarget(null);
      reload();
    } catch (x: any) {
      setErr(x.message);
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <div className="topbar">
        <h1>Transactions</h1>
        <div className="row">
          <button className="btn" onClick={csv} disabled={!data?.rows?.length}>
            Export CSV
          </button>
          <button className="btn primary" onClick={() => setForm({})}>
            + Add entry
          </button>
        </div>
      </div>

      <Msg err={error || err} />

      <div className="card form">
        <div>
          <label>From</label>
          <input type="date" value={f.from} onChange={set('from')} />
        </div>
        <div>
          <label>To</label>
          <input type="date" value={f.to} onChange={set('to')} />
        </div>
        <div>
          <label>Type</label>
          <select value={f.direction ?? ''} onChange={set('direction')}>
            <option value="">All</option>
            <option value="IN">Money in</option>
            <option value="OUT">Money out</option>
          </select>
        </div>
        <div>
          <label>Account</label>
          <select value={f.account_id ?? ''} onChange={set('account_id')}>
            <option value="">All</option>
            {lk?.accounts.map((a: any) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Category</label>
          <select value={f.category_id ?? ''} onChange={set('category_id')}>
            <option value="">All</option>
            {lk?.categories.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.direction === 'IN' ? '↓' : '↑'} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Search</label>
          <input
            placeholder="party, notes, ref…"
            value={f.q ?? ''}
            onChange={set('q')}
          />
        </div>
      </div>

      {data && (
        <div className="grid g4">
          <div className="card kpi">
            <div className="label">Money in</div>
            <div className="val in">{inr2(data.total_in)}</div>
          </div>
          <div className="card kpi">
            <div className="label">Money out</div>
            <div className="val out">{inr2(data.total_out)}</div>
          </div>
          <div className="card kpi">
            <div className="label">Net</div>
            <div className={`val ${data.total_in - data.total_out >= 0 ? 'in' : 'out'}`}>
              {inr2(data.total_in - data.total_out)}
            </div>
            <div className="sub">excludes transfers · {data.count} entries</div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Party</th>
                <th>Account</th>
                <th>Mode / Ref</th>
                <th>Notes</th>
                <th className="num">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((r: any) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.txn_date)}</td>
                  <td>
                    {r.transfer_group ? (
                      <span className="badge">⇄ TRANSFER</span>
                    ) : (
                      <>
                        <span className="dot" style={{ background: r.color ?? '#999' }} />
                        {r.category}
                      </>
                    )}
                    {r.doc_no && <div className="muted" style={{ fontSize: 11 }}>against {r.doc_no}</div>}
                    {r.claim_no && <div className="muted" style={{ fontSize: 11 }}>claim {r.claim_no}</div>}
                  </td>
                  <td>{r.party ?? '—'}</td>
                  <td>{r.account}</td>
                  <td>
                    {r.payment_mode}
                    {r.reference && <div className="muted" style={{ fontSize: 11 }}>{r.reference}</div>}
                  </td>
                  <td className="muted">{r.notes}</td>
                  <td className={`num ${r.direction === 'IN' ? 'in' : 'out'}`}>
                    {r.direction === 'IN' ? '+' : '−'}{inr2(r.amount)}
                  </td>
                  <td className="right" style={{ whiteSpace: 'nowrap' }}>
                    {!r.transfer_group && !r.claim_id && (
                      <button className="btn sm" onClick={() => setForm(r)}>
                        Edit
                      </button>
                    )}{' '}
                    <button className="btn sm ghost-red" onClick={() => setDeleteTarget(r)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {data && !data.rows.length && (
                <tr><td colSpan={8} className="muted" style={{ padding: 14 }}>No transactions found for the selected filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {data && (
          <div className="row" style={{ padding: 10 }}>
            <button
              className="btn sm"
              disabled={f.page <= 1}
              onClick={() => setF({ ...f, page: f.page - 1 })}
            >
              ← Prev
            </button>
            <span className="muted">
              Page {data.page} of {Math.max(1, Math.ceil(data.count / data.size))}
            </span>
            <button
              className="btn sm"
              disabled={data.page * data.size >= data.count}
              onClick={() => setF({ ...f, page: f.page + 1 })}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {form && lk && (
        <TxnForm
          lk={lk}
          initial={form.id ? form : undefined}
          onClose={() => setForm(null)}
          onSaved={reload}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title={deleteTarget.transfer_group ? 'Delete Transfer Pair' : 'Delete Transaction'}
          message={
            deleteTarget.transfer_group
              ? `This entry is part of a 2-leg transfer of ${inr2(deleteTarget.amount)}. Deleting it will atomically remove both accounts' records. Do you wish to continue?`
              : `Are you sure you want to delete this ${deleteTarget.direction === 'IN' ? 'income' : 'expense'} entry of ${inr2(deleteTarget.amount)}? This action cannot be undone.`
          }
          confirmText="Yes, Delete"
          cancelText="Cancel"
          danger
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => executeDelete(deleteTarget)}
        />
      )}
    </>
  );
}
