'use client';
import Link from 'next/link';
import { useState } from 'react';
import ClaimForm from '@/components/ClaimForm';
import { Badge, Field, Modal, Msg } from '@/components/ui';
import { apiCall, fmtDate, inr2, todayStr, useData } from '@/lib/client';

export default function ClaimDetail({ params }: { params: { id: string } }) {
  const { data: c, reload } = useData<any>(`/api/claims/${params.id}`);
  const { data: me } = useData<any>('/api/auth/me');
  const { data: lk } = useData<any>('/api/lookups');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [review, setReview] = useState<any>(null);
  const [pay, setPay] = useState<any>(null);
  const [edit, setEdit] = useState(false);
  const [view, setView] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!c || !me) return <p style={{ padding: 20 }}>Loading…</p>;

  const approver = ['OWNER', 'ACCOUNTANT'].includes(me.role);
  const mine = c.employee_id === me.user.id;

  const run = async (fn: () => Promise<any>, msg: string) => {
    setErr('');
    setOk('');
    setBusy(true);
    try {
      await fn();
      setOk(msg);
      setReview(null);
      setPay(null);
      reload();
    } catch (x: any) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  if (edit) {
    return (
      <>
        <div className="topbar">
          <h1>Edit {c.claim_no}</h1>
          <button className="btn" onClick={() => setEdit(false)}>Cancel</button>
        </div>
        <ClaimForm
          initial={{
            id: c.id,
            title: c.title,
            items: c.items.map((i: any) => ({
              expense_date: i.expense_date,
              category_id: i.category_id,
              description: i.description,
              amount: i.amount,
              receipt_url: i.receipt_url,
              receipt_mime: i.receipt_mime,
            })),
          }}
        />
      </>
    );
  }

  function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!review.approve && !review.note?.trim()) {
      setErr('Please provide a reason for rejecting the claim.');
      return;
    }
    if (review.approve && review.approved_amount) {
      const amt = Number(review.approved_amount);
      if (isNaN(amt) || amt <= 0 || amt > Number(c.total)) {
        setErr(`Approved amount must be between 0.01 and ${inr2(c.total)}.`);
        return;
      }
    }

    run(
      () =>
        apiCall(`/api/claims/${c.id}/${review.approve ? 'approve' : 'reject'}`, 'POST', {
          approved_amount: review.approve ? Number(review.approved_amount || c.total) : undefined,
          note: review.note?.trim() || null,
        }),
      review.approve ? 'Claim approved' : 'Claim rejected'
    );
  }

  function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!pay.account_id) {
      setErr('Please select an account to pay from.');
      return;
    }
    run(
      () =>
        apiCall(`/api/claims/${c.id}/pay`, 'POST', {
          account_id: Number(pay.account_id),
          payment_mode: pay.payment_mode || 'BANK',
          txn_date: pay.txn_date || todayStr(),
          reference: pay.reference?.trim() || null,
        }),
      'Reimbursed and recorded in cash book'
    );
  }

  return (
    <>
      <div className="topbar">
        <h1>
          {c.claim_no} <Badge s={c.status} />
        </h1>
        <div className="row no-print">
          <Link className="btn" href="/claims">← Claims</Link>
          <button className="btn" onClick={() => print()}>Print</button>
          {mine && ['DRAFT', 'REJECTED'].includes(c.status) && (
            <>
              <button className="btn" onClick={() => setEdit(true)}>Edit</button>
              <button
                className="btn primary"
                disabled={busy}
                onClick={() => run(() => apiCall(`/api/claims/${c.id}/submit`, 'POST'), 'Submitted for approval')}
              >
                Submit
              </button>
            </>
          )}
          {approver && !mine && c.status === 'SUBMITTED' && (
            <>
              <button className="btn red" disabled={busy} onClick={() => setReview({ approve: false })}>
                Reject
              </button>
              <button className="btn green" disabled={busy} onClick={() => setReview({ approve: true, approved_amount: c.total })}>
                Approve
              </button>
            </>
          )}
          {approver && c.status === 'APPROVED' && (
            <button
              className="btn green"
              disabled={busy}
              onClick={() =>
                setPay({
                  account_id: lk?.accounts[0]?.id,
                  payment_mode: 'BANK',
                  txn_date: todayStr(),
                })
              }
            >
              Reimburse {inr2(c.approved_amount)}
            </button>
          )}
        </div>
      </div>

      <Msg err={err} ok={ok} />

      {c.status === 'REJECTED' && (
        <div className="err">
          Rejected by {c.reviewer}: {c.review_note}
          {mine && ' — edit and resubmit.'}
        </div>
      )}

      <div className="grid g4">
        <div className="card">
          <div className="muted">Employee</div>
          <b>{c.employee}</b>
          <div className="muted">{c.employee_email}</div>
        </div>
        <div className="card">
          <div className="muted">Title</div>
          <b>{c.title}</b>
        </div>
        <div className="card">
          <div className="muted">Claimed / Approved</div>
          <b>
            {inr2(c.total)} / {c.approved_amount != null ? inr2(c.approved_amount) : '—'}
          </b>
          {c.review_note && c.status !== 'REJECTED' && <div className="muted">Note: {c.review_note}</div>}
        </div>
        <div className="card">
          <div className="muted">Timeline</div>
          <div style={{ fontSize: 12 }}>
            Submitted {fmtDate(c.submitted_at)}
            <br />
            Reviewed {fmtDate(c.reviewed_at)} {c.reviewer && `by ${c.reviewer}`}
            <br />
            Paid {fmtDate(c.paid_at)} {c.paid_from && `from ${c.paid_from}`}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Receipt</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {c.items.map((i: any) => (
                <tr key={i.id}>
                  <td>{fmtDate(i.expense_date)}</td>
                  <td>{i.category}</td>
                  <td>{i.description}</td>
                  <td>
                    {i.receipt_url ? (
                      i.receipt_mime?.startsWith('image') ? (
                        <img
                          className="thumb"
                          src={i.receipt_url}
                          alt="receipt"
                          style={{ cursor: 'zoom-in' }}
                          onClick={() => setView(i.receipt_url)}
                        />
                      ) : (
                        <a href={i.receipt_url} download={`receipt-${i.id}.pdf`}>PDF</a>
                      )
                    ) : (
                      <span className="badge s-OVERDUE">missing</span>
                    )}
                  </td>
                  <td className="num"><b>{inr2(i.amount)}</b></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={4} className="right">Total</th>
                <th className="num"><b>{inr2(c.total)}</b></th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {review && (
        <Modal title={review.approve ? 'Approve claim' : 'Reject claim'} onClose={() => setReview(null)}>
          <form onSubmit={handleReview}>
            <div className="form">
              {review.approve && (
                <Field label={`Approved amount (max ${inr2(c.total)})`}>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={c.total}
                    value={review.approved_amount}
                    onChange={e => setReview({ ...review, approved_amount: e.target.value })}
                  />
                </Field>
              )}
              <Field label={review.approve ? 'Note (optional)' : 'Reason *'} wide>
                <input
                  required={!review.approve}
                  placeholder={review.approve ? 'Optional approval note' : 'Explain reason for rejection'}
                  value={review.note ?? ''}
                  onChange={e => setReview({ ...review, note: e.target.value })}
                />
              </Field>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn" disabled={busy} onClick={() => setReview(null)}>Cancel</button>
              <button
                type="submit"
                disabled={busy}
                className={`btn ${review.approve ? 'green' : 'red'}`}
              >
                {busy ? 'Processing…' : review.approve ? 'Approve' : 'Reject'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {pay && lk && (
        <Modal title={`Reimburse ${c.employee}`} onClose={() => setPay(null)}>
          <p className="muted">This posts {inr2(c.approved_amount)} as money out in the cash book.</p>
          <form onSubmit={handlePay}>
            <div className="form">
              <Field label="Pay from account *">
                <select required value={pay.account_id} onChange={e => setPay({ ...pay, account_id: e.target.value })}>
                  {lk.accounts.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Mode">
                <select value={pay.payment_mode} onChange={e => setPay({ ...pay, payment_mode: e.target.value })}>
                  {['BANK', 'UPI', 'CASH', 'CHEQUE'].map(m => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="Date *">
                <input type="date" required value={pay.txn_date} onChange={e => setPay({ ...pay, txn_date: e.target.value })} />
              </Field>
              <Field label="Reference / UTR">
                <input
                  placeholder="e.g. Bank UTR / Cheque #"
                  value={pay.reference ?? ''}
                  onChange={e => setPay({ ...pay, reference: e.target.value })}
                />
              </Field>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn" disabled={busy} onClick={() => setPay(null)}>Cancel</button>
              <button type="submit" disabled={busy} className="btn green">
                {busy ? 'Processing…' : 'Pay & Record'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {view && (
        <Modal title="Receipt preview" onClose={() => setView(null)}>
          <img src={view} alt="receipt" style={{ width: '100%', borderRadius: 8 }} />
        </Modal>
      )}
    </>
  );
}
