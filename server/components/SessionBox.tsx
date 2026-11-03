'use client';
import { apiCall } from '@/lib/client';
export default function SessionBox({ businesses, current, name, role }: { businesses: any[]; current: number; name: string; role: string }) {
  return <div style={{ padding: '0 6px 6px' }}>
    <select value={current} onChange={async e => { await apiCall('/api/auth/switch', 'POST', { org_id: Number(e.target.value) }); location.href = '/'; }}>
      {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
    <div className="row" style={{ fontSize: 12, padding: '0 4px', alignItems: 'flex-start' }}><div><div style={{ color: '#fff' }}>{name}</div><div>{role}</div></div><div className="spacer" />
      <a style={{ color: '#ff9fc9', cursor: 'pointer' }} onClick={async () => { await apiCall('/api/auth/logout', 'POST'); location.href = '/login'; }}>Sign out</a></div>
  </div>;
}
