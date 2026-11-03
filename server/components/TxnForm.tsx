'use client';
import { useState } from 'react';
import { apiCall, todayStr } from '@/lib/client';
import { Field, Modal, Msg } from './ui';

type Lk = { accounts: any[]; categories: any[]; parties: any[] };
const MODES = ['CASH', 'UPI', 'BANK', 'CARD', 'CHEQUE', 'OTHER'];

/** Add / edit income, expense, or account transfer */
export default function TxnForm({ lk, initial, onClose, onSaved }: { lk: Lk; initial?: any; onClose: () => void; onSaved: () => void }) {
  const [mode, setMode] = useState<'IN' | 'OUT' | 'TRANSFER'>(initial?.direction ?? 'IN');
  const [f, setF] = useState<any>(initial ?? { txn_date: todayStr(), payment_mode: 'CASH', account_id: lk.accounts[0]?.id ?? '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const cats = lk.categories.filter(c => c.direction === mode);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr('');

    const amt = Number(f.amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setErr('Please enter a valid positive amount.');
      return;
    }
    if (!f.txn_date) {
      setErr('Please specify transaction date.');
      return;
    }
    if (!f.account_id) {
      setErr('Please select an account.');
      return;
    }

    if (mode === 'TRANSFER') {
      if (!f.to_account_id) {
        setErr('Please select the destination account.');
        return;
      }
      if (String(f.account_id) === String(f.to_account_id)) {
        setErr('Cannot transfer to the same account.');
        return;
      }
    } else {
      if (!f.category_id) {
        setErr('Please select a category.');
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'TRANSFER') {
        await apiCall('/api/transfers', 'POST', {
          txn_date: f.txn_date,
          amount: amt,
          from_account_id: Number(f.account_id),
          to_account_id: Number(f.to_account_id),
          reference: f.reference || null,
          notes: f.notes || null,
        });
      } else if (initial?.id) {
        await apiCall(`/api/transactions/${initial.id}`, 'PUT', {
          ...f,
          amount: amt,
          account_id: Number(f.account_id),
          category_id: Number(f.category_id),
          party_id: f.party_id ? Number(f.party_id) : null,
          direction: mode,
        });
      } else {
        await apiCall('/api/transactions', 'POST', {
          ...f,
          amount: amt,
          account_id: Number(f.account_id),
          category_id: Number(f.category_id),
          party_id: f.party_id ? Number(f.party_id) : null,
          direction: mode,
        });
      }
      onSaved();
      onClose();
    } catch (x: any) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={initial?.id ? 'Edit entry' : 'New cash entry'} onClose={onClose}>
      {!initial?.id && (
        <div className="tabs" style={{ marginBottom: 14 }}>
          {([['IN', '＋ Money in'], ['OUT', '－ Money out'], ['TRANSFER', '⇄ Transfer']] as const).map(([k, l]) => (
            <button
              key={k}
              type="button"
              className={mode === k ? 'on' : ''}
              onClick={() => {
                setMode(k);
                setF({ ...f, category_id: '' });
              }}
            >
              {l}
            </button>
          ))}
        </div>
      )}
      <Msg err={err} />
      <form onSubmit={save}>
        <div className="form">
          <Field label="Date *">
            <input type="date" required value={f.txn_date} onChange={set('txn_date')} />
          </Field>
          <Field label="Amount (₹) *">
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              value={f.amount ?? ''}
              onChange={set('amount')}
              autoFocus
            />
          </Field>
          <Field label={mode === 'TRANSFER' ? 'From account *' : 'Account *'}>
            <select required value={f.account_id} onChange={set('account_id')}>
              <option value="">— Select account —</option>
              {lk.accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </Field>
          {mode === 'TRANSFER' ? (
            <Field label="To account *">
              <select required value={f.to_account_id ?? ''} onChange={set('to_account_id')}>
                <option value="">— Select destination —</option>
                {lk.accounts.filter(a => String(a.id) !== String(f.account_id)).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
          ) : (
            <>
              <Field label="Category *">
                <select required value={f.category_id ?? ''} onChange={set('category_id')}>
                  <option value="">— Select category —</option>
                  {cats.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label={mode === 'IN' ? 'Received from' : 'Paid to'}>
                <select value={f.party_id ?? ''} onChange={set('party_id')}>
                  <option value="">— (Optional) —</option>
                  {lk.parties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Payment mode">
                <select value={f.payment_mode} onChange={set('payment_mode')}>
                  {MODES.map(m => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
            </>
          )}
          <Field label="Reference (UTR / cheque / bill no.)">
            <input placeholder="e.g. UTR12345678" value={f.reference ?? ''} onChange={set('reference')} />
          </Field>
          <Field label="Notes" wide>
            <input placeholder="Additional notes..." value={f.notes ?? ''} onChange={set('notes')} />
          </Field>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="btn" disabled={busy} onClick={onClose}>Cancel</button>
          <button
            type="submit"
            disabled={busy}
            className={`btn ${mode === 'OUT' ? 'red' : mode === 'IN' ? 'green' : 'primary'}`}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
