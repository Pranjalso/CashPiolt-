'use client';
import Link from 'next/link';
import { useState } from 'react';
const TYPES = ['RETAIL', 'RESTAURANT', 'MANUFACTURING', 'TRADING', 'SERVICES', 'IT_SOFTWARE', 'CONSTRUCTION', 'HEALTHCARE', 'EDUCATION', 'TRANSPORT', 'AGRICULTURE', 'FREELANCER', 'NGO', 'OTHER'];
export default function Register() {
  const [f, setF] = useState<any>({ business_type: 'RETAIL' }); const [err, setErr] = useState('');
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  async function go(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    const r = await fetch('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) });
    if (r.ok) location.href = '/'; else setErr((await r.json()).error);
  }
  return <div className="auth"><form className="card" onSubmit={go}>
    <h2 style={{ marginTop: 0 }}>Create your business</h2>
    <p className="muted">We set up income/expense categories to suit your type of business.</p>
    {err && <div className="err">{err}</div>}
    {[['name', 'Your name'], ['email', 'Email'], ['phone', 'Phone'], ['business_name', 'Business name']].map(([k, l]) =>
      <div key={k} style={{ marginBottom: 10 }}><label>{l}</label><input required={k !== 'phone'} value={f[k] ?? ''} onChange={set(k)} /></div>)}
    <label>Business type</label><select value={f.business_type} onChange={set('business_type')}>{TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' / ')}</option>)}</select>
    <div style={{ height: 10 }} /><label>Password (8+ characters)</label><input type="password" required minLength={8} value={f.password ?? ''} onChange={set('password')} />
    <div style={{ height: 16 }} /><button className="btn primary" style={{ width: '100%' }}>Create account</button>
    <p className="muted" style={{ textAlign: 'center' }}>Already registered? <Link href="/login">Sign in</Link></p>
  </form></div>;
}
