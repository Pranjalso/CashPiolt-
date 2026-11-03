'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Msg } from './ui';
import { apiCall, fileToDataUrl, inr2, todayStr, useData } from '@/lib/client';

type Line = {
  expense_date: string;
  category_id: string | number;
  description: string;
  amount: string | number;
  receipt_url?: string | null;
  receipt_mime?: string | null;
};

export default function ClaimForm({ initial }: { initial?: { id: number; title: string; items: Line[] } }) {
  const router = useRouter();
  const { data: lk } = useData<any>('/api/lookups');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [lines, setLines] = useState<Line[]>(
    initial?.items && initial.items.length > 0
      ? initial.items
      : [{ expense_date: todayStr(), category_id: '', description: '', amount: '' }]
  );
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const upd = (i: number, p: Partial<Line>) =>
    setLines(lines.map((l, j) => (j === i ? { ...l, ...p } : l)));

  const total = lines.reduce((s, l) => s + Number(l.amount || 0), 0);

  async function save(submit: boolean) {
    setErr('');
    if (!title.trim()) {
      setErr('Please provide a claim title.');
      return;
    }
    if (!lines.length) {
      setErr('Please add at least one expense line.');
      return;
    }

    const today = todayStr();
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const amt = Number(line.amount);
      if (!line.expense_date) {
        setErr(`Line ${idx + 1}: Please specify expense date.`);
        return;
      }
      if (line.expense_date > today) {
        setErr(`Line ${idx + 1}: Expense date cannot be in the future.`);
        return;
      }
      if (!line.category_id) {
        setErr(`Line ${idx + 1}: Please select an expense category.`);
        return;
      }
      if (!line.description?.trim()) {
        setErr(`Line ${idx + 1}: Please enter a description.`);
        return;
      }
      if (!amt || isNaN(amt) || amt <= 0) {
        setErr(`Line ${idx + 1}: Amount must be a positive number.`);
        return;
      }
    }

    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        submit,
        items: lines.map(l => ({
          expense_date: l.expense_date,
          category_id: Number(l.category_id),
          description: l.description.trim(),
          amount: Number(l.amount),
          receipt_url: l.receipt_url || null,
          receipt_mime: l.receipt_mime || null,
        })),
      };

      const r = initial
        ? (await apiCall(`/api/claims/${initial.id}`, 'PUT', body), { id: initial.id })
        : await apiCall('/api/claims', 'POST', body);

      router.push(`/claims/${r.id}`);
    } catch (x: any) {
      setErr(x.message);
      setBusy(false);
    }
  }

  return (
    <>
      <Msg err={err} />
      <div className="card">
        <label>Claim title *</label>
        <input
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Client visit – Pune, 12–13 Nov"
        />
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 140 }}>Date *</th>
                <th style={{ width: 200 }}>Category *</th>
                <th>Description *</th>
                <th style={{ width: 140 }}>Amount (₹) *</th>
                <th style={{ width: 160 }}>Receipt</th>
                <th style={{ width: 44 }} />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <input
                      type="date"
                      required
                      max={todayStr()}
                      value={l.expense_date}
                      onChange={e => upd(i, { expense_date: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      required
                      value={l.category_id}
                      onChange={e => upd(i, { category_id: e.target.value })}
                    >
                      <option value="">— Select —</option>
                      {lk?.categories
                        .filter((c: any) => c.direction === 'OUT')
                        .map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </td>
                  <td>
                    <input
                      required
                      value={l.description}
                      onChange={e => upd(i, { description: e.target.value })}
                      placeholder="What was it for?"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={l.amount}
                      onChange={e => upd(i, { amount: e.target.value })}
                    />
                  </td>
                  <td>
                    <div className="row">
                      {l.receipt_url &&
                        (l.receipt_mime?.startsWith('image') ? (
                          <img className="thumb" src={l.receipt_url} alt="receipt" />
                        ) : (
                          <span className="badge">PDF</span>
                        ))}
                      <label className="btn sm" style={{ margin: 0 }}>
                        {l.receipt_url ? 'Change' : '📎 Attach'}
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          style={{ display: 'none' }}
                          onChange={async e => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const { url, mime } = await fileToDataUrl(f);
                            upd(i, { receipt_url: url, receipt_mime: mime });
                          }}
                        />
                      </label>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn sm ghost-red"
                      onClick={() => setLines(lines.filter((_, j) => j !== i))}
                      disabled={lines.length === 1}
                      title="Remove line"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="row" style={{ padding: 12 }}>
          <button
            type="button"
            className="btn sm"
            onClick={() =>
              setLines([
                ...lines,
                { expense_date: todayStr(), category_id: '', description: '', amount: '' },
              ])
            }
          >
            + Add expense
          </button>
          <div className="spacer" />
          <b>Total: {inr2(total)}</b>
        </div>
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <button type="button" className="btn" disabled={busy} onClick={() => save(false)}>
          {busy ? 'Saving…' : 'Save draft'}
        </button>
        <button type="button" className="btn primary" disabled={busy} onClick={() => save(true)}>
          {busy ? 'Submitting…' : 'Submit for approval'}
        </button>
      </div>
    </>
  );
}
