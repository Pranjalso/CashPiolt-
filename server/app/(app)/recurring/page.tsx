'use client';
import { useState } from 'react';
import { Field, Modal, Msg } from '@/components/ui';
import { apiCall, fmtDate, inr2, todayStr, useData } from '@/lib/client';

export default function Recurring() {
  const { data, reload } = useData<any[]>('/api/recurring');
  const { data: lk } = useData<any>('/api/lookups');
  const [ed, setEd] = useState<any>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const monthly = (r: any) =>
    r.amount *
    (({ DAILY: 30, WEEKLY: 4.33, MONTHLY: 1, QUARTERLY: 1 / 3, YEARLY: 1 / 12 } as any)[r.frequency] || 1);
  const burn = (data ?? []).filter(r => r.active && r.direction === 'OUT').reduce((s, r) => s + monthly(r), 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr('');

    if (!ed.title?.trim()) {
      setErr('Title is required.');
      return;
    }
    const amt = Number(ed.amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setErr('Amount must be a positive number.');
      return;
    }
    if (!ed.category_id) {
      setErr('Please select a category.');
      return;
    }
    if (!ed.account_id) {
      setErr('Please select an account.');
      return;
    }
    if (!ed.next_date) {
      setErr('Next date is required.');
      return;
    }

    setBusy(true);
    try {
      await apiCall(
        ed.id ? `/api/recurring/${ed.id}` : '/api/recurring',
        ed.id ? 'PUT' : 'POST',
        {
          ...ed,
          title: ed.title.trim(),
          amount: amt,
          category_id: Number(ed.category_id),
          account_id: Number(ed.account_id),
          party_id: ed.party_id ? Number(ed.party_id) : null,
          end_date: ed.end_date || null,
        }
      );
      setEd(null);
      reload();
    } catch (x: any) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  }

  const set = (k: string) => (e: any) =>
    setEd({ ...ed, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <>
      <div className="topbar">
        <h1>Recurring entries</h1>
        <div className="row">
          <button
            className="btn"
            disabled={busy}
            onClick={async () => {
              setErr('');
              setBusy(true);
              try {
                const r = await apiCall('/api/recurring/run', 'POST');
                setOk(`${r.posted} due entries posted to the cash book`);
                reload();
              } catch (x: any) {
                setErr(x.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Post due entries now
          </button>
          <button
            className="btn primary"
            onClick={() =>
              setEd({
                direction: 'OUT',
                frequency: 'MONTHLY',
                next_date: todayStr(),
                auto_post: true,
                active: true,
              })
            }
          >
            + New
          </button>
        </div>
      </div>

      <Msg err={err} ok={ok} />

      <div className="grid g4">
        <div className="card kpi">
          <div className="label">Fixed monthly outgo (rent, salary, EMI…)</div>
          <div className="val out">{inr2(burn)}</div>
          <div className="sub">Used in the cash forecast</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Category</th>
                <th>Account</th>
                <th>Frequency</th>
                <th>Next date</th>
                <th>Auto-post</th>
                <th className="num">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data?.map(r => (
                <tr key={r.id} style={{ opacity: r.active ? 1 : 0.5 }}>
                  <td>
                    <b>{r.title}</b>
                    {r.party && <div className="muted" style={{ fontSize: 11 }}>{r.party}</div>}
                  </td>
                  <td className={r.direction === 'IN' ? 'in' : 'out'}>
                    {r.direction === 'IN' ? 'Money in' : 'Money out'}
                  </td>
                  <td>{r.category}</td>
                  <td>{r.account}</td>
                  <td>{r.frequency}</td>
                  <td>{fmtDate(r.next_date)}</td>
                  <td>{r.auto_post ? 'Yes' : 'Reminder only'}</td>
                  <td className="num"><b>{inr2(r.amount)}</b></td>
                  <td className="right">
                    <button
                      className="btn sm"
                      onClick={() =>
                        setEd({
                          ...r,
                          end_date: r.end_date ?? '',
                          party_id: r.party_id ?? '',
                        })
                      }
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {data && !data.length && <tr><td colSpan={9} className="muted">No recurring entries setup</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {ed && lk && (
        <Modal title={ed.id ? 'Edit recurring entry' : 'New recurring entry'} onClose={() => setEd(null)}>
          <Msg err={err} />
          <form onSubmit={save}>
            <div className="form">
              <Field label="Title *">
                <input required placeholder="e.g. Office Rent or Staff Salary" value={ed.title ?? ''} onChange={set('title')} />
              </Field>
              <Field label="Type">
                <select value={ed.direction} onChange={e => setEd({ ...ed, direction: e.target.value, category_id: '' })}>
                  <option value="OUT">Money out</option>
                  <option value="IN">Money in</option>
                </select>
              </Field>
              <Field label="Amount *">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={ed.amount ?? ''}
                  onChange={set('amount')}
                />
              </Field>
              <Field label="Category *">
                <select required value={ed.category_id ?? ''} onChange={set('category_id')}>
                  <option value="">— Select category —</option>
                  {lk.categories
                    .filter((c: any) => c.direction === ed.direction)
                    .map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </Field>
              <Field label="Account *">
                <select required value={ed.account_id ?? ''} onChange={set('account_id')}>
                  <option value="">— Select account —</option>
                  {lk.accounts.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Party">
                <select value={ed.party_id ?? ''} onChange={set('party_id')}>
                  <option value="">— (Optional) —</option>
                  {lk.parties.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Frequency">
                <select value={ed.frequency} onChange={set('frequency')}>
                  {['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'].map(f => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </Field>
              <Field label="Next date *">
                <input type="date" required value={ed.next_date} onChange={set('next_date')} />
              </Field>
              <Field label="End date (optional)">
                <input type="date" value={ed.end_date ?? ''} onChange={set('end_date')} />
              </Field>
              <Field label="Post automatically">
                <input type="checkbox" style={{ width: 'auto' }} checked={ed.auto_post} onChange={set('auto_post')} />
              </Field>
              <Field label="Active">
                <input type="checkbox" style={{ width: 'auto' }} checked={ed.active} onChange={set('active')} />
              </Field>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn" disabled={busy} onClick={() => setEd(null)}>Cancel</button>
              <button type="submit" disabled={busy} className="btn primary">
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
