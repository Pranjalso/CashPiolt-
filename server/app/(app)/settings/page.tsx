'use client';
import { useEffect, useState } from 'react';
import { ConfirmModal, Field, Msg } from '@/components/ui';
import { apiCall, useData } from '@/lib/client';

const TYPES = [
  'RETAIL', 'RESTAURANT', 'MANUFACTURING', 'TRADING', 'SERVICES', 'IT_SOFTWARE',
  'CONSTRUCTION', 'HEALTHCARE', 'EDUCATION', 'TRANSPORT', 'AGRICULTURE', 'FREELANCER', 'NGO', 'OTHER'
];
const ROLES: [string, string][] = [
  ['OWNER', 'Full control'],
  ['ACCOUNTANT', 'Cash book, dues, approve & pay claims'],
  ['EMPLOYEE', 'Submit own expense claims only'],
  ['VIEWER', 'Read-only reports']
];

export default function Settings() {
  const { data: biz, reload } = useData<any>('/api/businesses/current');
  const { data: members, reload: rm } = useData<any[]>('/api/members');
  const { data: me } = useData<any>('/api/auth/me');
  const [b, setB] = useState<any>(null);
  const [m, setM] = useState<any>({ role: 'EMPLOYEE' });
  const [nb, setNb] = useState<any>({ business_type: 'RETAIL' });
  const [removeMemberTarget, setRemoveMemberTarget] = useState<any>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (biz) setB(biz);
  }, [biz]);

  const owner = me?.role === 'OWNER';

  const run = async (fn: () => Promise<any>, msg: string) => {
    setErr('');
    setOk('');
    setBusy(true);
    try {
      await fn();
      setOk(msg);
      setRemoveMemberTarget(null);
    } catch (x: any) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!b.name?.trim()) {
      setErr('Business name is required.');
      return;
    }
    const fy = Number(b.fy_start_month);
    if (!fy || fy < 1 || fy > 12) {
      setErr('Financial year start month must be between 1 and 12.');
      return;
    }
    const alertLevel = Number(b.low_cash_alert);
    if (isNaN(alertLevel) || alertLevel < 0) {
      setErr('Low-cash alert level must be 0 or a positive number.');
      return;
    }

    run(async () => {
      await apiCall('/api/businesses/current', 'PUT', {
        name: b.name.trim(),
        business_type: b.business_type,
        currency: (b.currency || 'INR').trim().toUpperCase(),
        gstin: b.gstin?.trim() || null,
        fy_start_month: fy,
        low_cash_alert: alertLevel,
      });
      reload();
    }, 'Business profile saved');
  }

  function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!m.email?.trim()) {
      setErr('Member email is required.');
      return;
    }
    if (m.password && m.password.length < 8) {
      setErr('Temporary password must be at least 8 characters long.');
      return;
    }

    run(async () => {
      await apiCall('/api/members', 'POST', {
        email: m.email.trim(),
        role: m.role,
        name: m.name?.trim() || undefined,
        password: m.password || undefined,
      });
      setM({ role: 'EMPLOYEE' });
      rm();
    }, 'Member saved');
  }

  function handleCreateBusiness(e: React.FormEvent) {
    e.preventDefault();
    if (!nb.name?.trim()) {
      setErr('New business name is required.');
      return;
    }
    run(async () => {
      await apiCall('/api/businesses', 'POST', {
        name: nb.name.trim(),
        business_type: nb.business_type,
      });
      location.reload();
    }, 'Business created');
  }

  return (
    <>
      <div className="topbar">
        <h1>Business & team</h1>
      </div>
      <Msg err={err} ok={ok} />

      {b && (
        <div className="card">
          <h3>Business profile</h3>
          <form onSubmit={handleSaveProfile}>
            <div className="form">
              <Field label="Business name *">
                <input
                  disabled={!owner}
                  required
                  value={b.name}
                  onChange={e => setB({ ...b, name: e.target.value })}
                />
              </Field>
              <Field label="Business type">
                <select
                  disabled={!owner}
                  value={b.business_type}
                  onChange={e => setB({ ...b, business_type: e.target.value })}
                >
                  {TYPES.map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Currency">
                <input
                  disabled={!owner}
                  maxLength={3}
                  value={b.currency}
                  onChange={e => setB({ ...b, currency: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="GSTIN">
                <input
                  disabled={!owner}
                  placeholder="e.g. 27ABCDE1234F1Z5"
                  value={b.gstin ?? ''}
                  onChange={e => setB({ ...b, gstin: e.target.value })}
                />
              </Field>
              <Field label="Financial year starts (month 1-12)">
                <input
                  disabled={!owner}
                  type="number"
                  min={1}
                  max={12}
                  value={b.fy_start_month}
                  onChange={e => setB({ ...b, fy_start_month: e.target.value })}
                />
              </Field>
              <Field label="Low-cash alert level (₹)">
                <input
                  disabled={!owner}
                  type="number"
                  min={0}
                  value={b.low_cash_alert}
                  onChange={e => setB({ ...b, low_cash_alert: e.target.value })}
                />
              </Field>
            </div>
            {owner && (
              <button type="submit" disabled={busy} className="btn primary" style={{ marginTop: 14 }}>
                {busy ? 'Saving…' : 'Save profile'}
              </button>
            )}
          </form>
        </div>
      )}

      <div className="card">
        <h3>Team members</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                {owner && <th />}
              </tr>
            </thead>
            <tbody>
              {members?.map(u => (
                <tr key={u.id}>
                  <td><b>{u.name}</b></td>
                  <td>{u.email}</td>
                  <td><span className="badge">{u.role}</span></td>
                  {owner && (
                    <td className="right">
                      {u.id !== me?.user?.id && (
                        <button
                          type="button"
                          className="btn sm ghost-red"
                          onClick={() => setRemoveMemberTarget(u)}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {owner && (
          <>
            <h3 style={{ marginTop: 22 }}>Add or invite member</h3>
            <form onSubmit={handleAddMember}>
              <div className="form">
                <Field label="Email *">
                  <input
                    type="email"
                    required
                    placeholder="teammate@company.com"
                    value={m.email ?? ''}
                    onChange={e => setM({ ...m, email: e.target.value })}
                  />
                </Field>
                <Field label="Role *">
                  <select value={m.role} onChange={e => setM({ ...m, role: e.target.value })}>
                    {ROLES.map(([r, d]) => (
                      <option key={r} value={r}>{r} — {d}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Name (for new users)">
                  <input
                    placeholder="Full name"
                    value={m.name ?? ''}
                    onChange={e => setM({ ...m, name: e.target.value })}
                  />
                </Field>
                <Field label="Temp password (for new users, 8+ chars)">
                  <input
                    type="password"
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    value={m.password ?? ''}
                    onChange={e => setM({ ...m, password: e.target.value })}
                  />
                </Field>
              </div>
              <button type="submit" disabled={busy} className="btn primary" style={{ marginTop: 14 }}>
                {busy ? 'Saving…' : 'Save member'}
              </button>
            </form>
          </>
        )}
      </div>

      <div className="card">
        <h3>Add another business</h3>
        <p className="muted">Run several businesses from one login; switch between them anytime from the sidebar.</p>
        <form onSubmit={handleCreateBusiness}>
          <div className="form">
            <Field label="Business name *">
              <input
                required
                placeholder="e.g. Branch office or Sister company"
                value={nb.name ?? ''}
                onChange={e => setNb({ ...nb, name: e.target.value })}
              />
            </Field>
            <Field label="Business type">
              <select value={nb.business_type} onChange={e => setNb({ ...nb, business_type: e.target.value })}>
                {TYPES.map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>
          <button type="submit" disabled={busy} className="btn" style={{ marginTop: 14 }}>
            {busy ? 'Creating…' : 'Create business'}
          </button>
        </form>
      </div>

      {removeMemberTarget && (
        <ConfirmModal
          title="Remove Team Member"
          message={`Are you sure you want to remove ${removeMemberTarget.name} (${removeMemberTarget.email}) from this business organization?`}
          confirmText="Yes, Remove"
          cancelText="Cancel"
          danger
          onCancel={() => setRemoveMemberTarget(null)}
          onConfirm={() =>
            run(async () => {
              await apiCall('/api/members', 'DELETE', { user_id: removeMemberTarget.id });
              rm();
            }, 'Member removed')
          }
        />
      )}
    </>
  );
}
