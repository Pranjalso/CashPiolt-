'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui';
import { fmtDate, inr2, useData } from '@/lib/client';

export default function Claims() {
  const [st, setSt] = useState('');
  const { data } = useData<any[]>(`/api/claims${st ? `?status=${st}` : ''}`);
  const { data: me } = useData<any>('/api/auth/me');
  const approver = me && ['OWNER', 'ACCOUNTANT'].includes(me.role);
  const sum = (s: string) =>
    (data ?? []).filter(c => c.status === s).reduce((t, c) => t + (c.approved_amount ?? c.total), 0);

  return (
    <>
      <div className="topbar">
        <h1>{approver ? 'Expense claims' : 'My expense claims'}</h1>
        <div className="row">
          <select
            value={st}
            onChange={e => setSt(e.target.value)}
            style={{ width: 170 }}
          >
            <option value="">All statuses</option>
            {['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {me?.role !== 'VIEWER' && (
            <Link className="btn primary" href="/claims/new">
              + New claim
            </Link>
          )}
        </div>
      </div>

      <div className="grid g4">
        <div className="card kpi">
          <div className="label">{approver ? 'Awaiting your review' : 'Submitted'}</div>
          <div className="val">{inr2(sum('SUBMITTED'))}</div>
        </div>
        <div className="card kpi">
          <div className="label">Approved, to be reimbursed</div>
          <div className="val">{inr2(sum('APPROVED'))}</div>
        </div>
        <div className="card kpi">
          <div className="label">Reimbursed</div>
          <div className="val in">{inr2(sum('PAID'))}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Claim</th>
                <th>Title</th>
                {approver && <th>Employee</th>}
                <th>Submitted</th>
                <th className="num">Lines</th>
                <th>Status</th>
                <th className="num">Claimed</th>
                <th className="num">Approved</th>
              </tr>
            </thead>
            <tbody>
              {data?.map(c => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/claims/${c.id}`}>
                      <b>{c.claim_no}</b>
                    </Link>
                  </td>
                  <td>{c.title}</td>
                  {approver && <td>{c.employee}</td>}
                  <td>{fmtDate(c.submitted_at)}</td>
                  <td className="num">{c.items}</td>
                  <td><Badge s={c.status} /></td>
                  <td className="num">{inr2(c.total)}</td>
                  <td className="num">
                    {c.approved_amount != null ? inr2(c.approved_amount) : '—'}
                  </td>
                </tr>
              ))}
              {data && !data.length && (
                <tr>
                  <td colSpan={8} className="muted" style={{ padding: 14 }}>
                    No claims yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
