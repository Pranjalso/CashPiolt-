'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge, ConfirmModal, Field, Modal, Msg } from '@/components/ui';
import { apiCall, fmtDate, inr2, todayStr, useData } from '@/lib/client';

export default function Dues() {
  const sp = useSearchParams();
  const router = useRouter();
  const kind = sp.get('kind') === 'PAYABLE' ? 'PAYABLE' : 'RECEIVABLE';
  const [status, setStatus] = useState('OPEN');
  const { data, reload } = useData<any[]>(`/api/dues?kind=${kind}${status ? `&status=${status}` : ''}`);
  const { data: lk } = useData<any>('/api/lookups');
  const [add, setAdd] = useState<any>(null);
  const [pay, setPay] = useState<any>(null);
  const [viewDue, setViewDue] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const { data: dueDetail } = useData<any>(viewDue ? `/api/dues/${viewDue}` : null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const recv = kind === 'RECEIVABLE';
  const total = (data ?? []).reduce((s, d) => s + d.outstanding, 0);
  const overdue = (data ?? []).filter(d => d.days_overdue > 0).reduce((s, d) => s + d.outstanding, 0);

  const run = async (fn: () => Promise<any>, msg: string) => {
    setErr('');
    setOk('');
    setBusy(true);
    try {
      await fn();
      setOk(msg);
      setAdd(null);
      setPay(null);
      setCancelTarget(null);
      reload();
    } catch (x: any) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  function handleSaveDue(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(add.amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setErr('Amount must be a positive number.');
      return;
    }
    if (!add.due_date) {
      setErr('Due date is required.');
      return;
    }
    if (add.issue_date && add.due_date && add.due_date < add.issue_date) {
      setErr('Due date cannot be earlier than issue date.');
      return;
    }

    run(() => apiCall('/api/dues', 'POST', {
      kind,
      party_id: add.party_id ? Number(add.party_id) : null,
      category_id: add.category_id ? Number(add.category_id) : null,
      doc_no: add.doc_no?.trim() || null,
      amount: amt,
      issue_date: add.issue_date || todayStr(),
      due_date: add.due_date,
      description: add.description?.trim() || null,
    }), 'Saved');
  }

  function handleSettleDue(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(pay.amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setErr('Payment amount must be greater than zero.');
      return;
    }
    if (amt > Number(pay.due.outstanding)) {
      setErr(`Payment amount cannot exceed outstanding balance (${inr2(pay.due.outstanding)}).`);
      return;
    }
    if (!pay.account_id) {
      setErr('Please select an account.');
      return;
    }

    const { due, ...b } = pay;
    run(() => apiCall(`/api/dues/${due.id}/settle`, 'POST', {
      amount: amt,
      txn_date: b.txn_date || todayStr(),
      account_id: Number(b.account_id),
      payment_mode: b.payment_mode || 'BANK',
      reference: b.reference?.trim() || null,
    }), 'Payment recorded in cash book');
  }

  return (
    <>
      <div className="topbar">
        <h1>{recv ? 'Receivables — money customers owe you' : 'Payables — bills you need to pay'}</h1>
        <div className="row">
          <div className="tabs">
            {[['RECEIVABLE', 'Receivables'], ['PAYABLE', 'Payables']].map(([k, l]) => (
              <button
                key={k}
                className={kind === k ? 'on' : ''}
                onClick={() => router.push(`/dues?kind=${k}`)}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            className="btn primary"
            onClick={() => setAdd({ kind, issue_date: todayStr(), due_date: todayStr(), amount: '' })}
          >
            + New {recv ? 'invoice' : 'bill'}
          </button>
        </div>
      </div>

      <Msg err={err} ok={ok} />

      <div className="grid g4">
        <div className="card kpi">
          <div className="label">Outstanding</div>
          <div className="val">{inr2(total)}</div>
        </div>
        <div className="card kpi">
          <div className="label">Overdue</div>
          <div className="val out">{inr2(overdue)}</div>
        </div>
        <div className="card kpi">
          <div className="label">Show</div>
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ marginTop: 6 }}>
            <option value="OPEN">Open & part-paid</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="">All</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Doc no.</th>
                <th>{recv ? 'Customer' : 'Vendor'}</th>
                <th>Description</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Status</th>
                <th className="num">Amount</th>
                <th className="num">{recv ? 'Received' : 'Paid'}</th>
                <th className="num">Outstanding</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data?.map(d => (
                <tr key={d.id}>
                  <td>
                    <button
                      className="btn sm"
                      style={{ padding: '2px 6px', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                      onClick={() => setViewDue(d.id)}
                    >
                      <b>{d.doc_no ?? '#' + d.id}</b>
                    </button>
                  </td>
                  <td>{d.party_name ?? '—'}</td>
                  <td className="muted">{d.description || '—'}</td>
                  <td>{fmtDate(d.issue_date)}</td>
                  <td>
                    {fmtDate(d.due_date)}
                    {d.days_overdue > 0 && <div><span className="badge s-OVERDUE">{d.days_overdue} days overdue</span></div>}
                  </td>
                  <td><Badge s={d.status} /></td>
                  <td className="num">{inr2(d.amount)}</td>
                  <td className="num">{inr2(d.paid)}</td>
                  <td className="num"><b>{inr2(d.outstanding)}</b></td>
                  <td className="right" style={{ whiteSpace: 'nowrap' }}>
                    {['OPEN', 'PARTIAL'].includes(d.status) && (
                      <button
                        className="btn sm green"
                        onClick={() =>
                          setPay({
                            due: d,
                            amount: d.outstanding,
                            txn_date: todayStr(),
                            account_id: lk?.accounts[0]?.id,
                            payment_mode: 'BANK',
                          })
                        }
                      >
                        {recv ? 'Receive' : 'Pay'}
                      </button>
                    )}
                    {d.status === 'OPEN' && (
                      <>
                        {' '}
                        <button
                          className="btn sm ghost-red"
                          onClick={() => setCancelTarget(d)}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {data && !data.length && <tr><td colSpan={10} className="muted">Nothing here</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {add && lk && (
        <Modal title={`New ${recv ? 'invoice (receivable)' : 'bill (payable)'}`} onClose={() => setAdd(null)}>
          <form onSubmit={handleSaveDue}>
            <div className="form">
              <Field label={recv ? 'Customer' : 'Vendor'}>
                <select value={add.party_id ?? ''} onChange={e => setAdd({ ...add, party_id: e.target.value })}>
                  <option value="">— Select party —</option>
                  {lk.parties.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Doc / invoice no.">
                <input
                  placeholder="e.g. INV-2024-001"
                  value={add.doc_no ?? ''}
                  onChange={e => setAdd({ ...add, doc_no: e.target.value })}
                />
              </Field>
              <Field label="Amount *">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={add.amount ?? ''}
                  onChange={e => setAdd({ ...add, amount: e.target.value })}
                />
              </Field>
              <Field label="Category">
                <select value={add.category_id ?? ''} onChange={e => setAdd({ ...add, category_id: e.target.value })}>
                  <option value="">— Select category —</option>
                  {lk.categories.filter((c: any) => c.direction === (recv ? 'IN' : 'OUT')).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Issue date">
                <input type="date" value={add.issue_date} onChange={e => setAdd({ ...add, issue_date: e.target.value })} />
              </Field>
              <Field label="Due date *">
                <input type="date" required value={add.due_date} onChange={e => setAdd({ ...add, due_date: e.target.value })} />
              </Field>
              <Field label="Description" wide>
                <input
                  placeholder="Items or terms summary..."
                  value={add.description ?? ''}
                  onChange={e => setAdd({ ...add, description: e.target.value })}
                />
              </Field>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn" disabled={busy} onClick={() => setAdd(null)}>Cancel</button>
              <button type="submit" disabled={busy} className="btn primary">
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {pay && lk && (
        <Modal title={`${recv ? 'Receive payment' : 'Pay bill'} — ${pay.due.doc_no ?? '#' + pay.due.id}`} onClose={() => setPay(null)}>
          <p className="muted">Outstanding {inr2(pay.due.outstanding)}. Part payments are allowed.</p>
          <form onSubmit={handleSettleDue}>
            <div className="form">
              <Field label="Amount *">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  max={pay.due.outstanding}
                  value={pay.amount}
                  onChange={e => setPay({ ...pay, amount: e.target.value })}
                />
              </Field>
              <Field label="Date *">
                <input type="date" required value={pay.txn_date} onChange={e => setPay({ ...pay, txn_date: e.target.value })} />
              </Field>
              <Field label={recv ? 'Into account *' : 'From account *'}>
                <select required value={pay.account_id} onChange={e => setPay({ ...pay, account_id: e.target.value })}>
                  {lk.accounts.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Mode">
                <select value={pay.payment_mode} onChange={e => setPay({ ...pay, payment_mode: e.target.value })}>
                  {['BANK', 'UPI', 'CASH', 'CHEQUE', 'CARD', 'OTHER'].map(m => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="Reference / UTR" wide>
                <input
                  placeholder="e.g. Bank reference or Cheque number"
                  value={pay.reference ?? ''}
                  onChange={e => setPay({ ...pay, reference: e.target.value })}
                />
              </Field>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn" disabled={busy} onClick={() => setPay(null)}>Cancel</button>
              <button type="submit" disabled={busy} className="btn green">
                {busy ? 'Recording…' : 'Record'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewDue && dueDetail && (
        <Modal title={`${dueDetail.kind === 'RECEIVABLE' ? 'Invoice' : 'Bill'} details — ${dueDetail.doc_no ?? '#' + dueDetail.id}`} onClose={() => setViewDue(null)}>
          <div className="grid g4" style={{ marginBottom: 16 }}>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="muted">{dueDetail.kind === 'RECEIVABLE' ? 'Customer' : 'Vendor'}</div>
              <b>{dueDetail.party_name ?? '—'}</b>
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="muted">Total Amount</div>
              <b>{inr2(dueDetail.amount)}</b>
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="muted">{dueDetail.kind === 'RECEIVABLE' ? 'Received' : 'Paid'}</div>
              <b className="in">{inr2(dueDetail.paid)}</b>
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="muted">Outstanding</div>
              <b className="out">{inr2(dueDetail.outstanding)}</b>
            </div>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <h4 style={{ padding: '12px 14px', margin: 0, borderBottom: '1px solid var(--line)' }}>Payment History</h4>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Account</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {dueDetail.payments?.map((p: any) => (
                    <tr key={p.id}>
                      <td>{fmtDate(p.txn_date)}</td>
                      <td>{p.account}</td>
                      <td className="num"><b>{inr2(p.amount)}</b></td>
                    </tr>
                  ))}
                  {(!dueDetail.payments || !dueDetail.payments.length) && (
                    <tr><td colSpan={3} className="muted">No payments recorded yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn" onClick={() => setViewDue(null)}>Close</button>
          </div>
        </Modal>
      )}

      {cancelTarget && (
        <ConfirmModal
          title="Cancel Outstanding Due"
          message={`Are you sure you want to cancel ${cancelTarget.doc_no ? cancelTarget.doc_no : '#' + cancelTarget.id} (${inr2(cancelTarget.outstanding)})? This action cannot be undone.`}
          confirmText="Yes, Cancel Item"
          cancelText="Keep Item"
          danger
          onCancel={() => setCancelTarget(null)}
          onConfirm={() =>
            run(() => apiCall(`/api/dues/${cancelTarget.id}/cancel`, 'POST'), 'Item cancelled successfully')
          }
        />
      )}
    </>
  );
}
