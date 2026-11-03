'use client';
import Link from 'next/link';
import { useState } from 'react';
export default function Login() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [err, setErr] = useState('');
  async function go(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (r.ok) location.href = '/'; else setErr((await r.json()).error);
  }
  return <div className="auth"><form className="card" onSubmit={go} autoComplete="off">
    <h2 style={{ marginTop: 0 }}>Cash<span style={{ color: 'var(--pink)' }}>Pilot</span></h2>
    <p className="muted">Cash flow &amp; expense claims for every business</p>
    {err && <div className="err">{err}</div>}
    <label>Email</label><input type="email" required placeholder="name@business.com" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} /><div style={{ height: 10 }} />
    <label>Password</label><input type="password" required placeholder="Enter password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /><div style={{ height: 16 }} />
    <button className="btn primary" style={{ width: '100%' }}>Sign in</button>
    <p className="muted" style={{ textAlign: 'center' }}>New business? <Link href="/register">Create an account</Link></p>
  </form></div>;
}
