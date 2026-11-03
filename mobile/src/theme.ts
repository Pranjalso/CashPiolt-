export const C = {
  navy: '#0B1F4B', indigo: '#3B4FE0', pink: '#E91E7B', teal: '#12b39a', bg: '#f4f6fb', card: '#ffffff',
  line: '#e3e7f0', muted: '#6b7590', text: '#1b2440', red: '#dc2626', amber: '#d97706', green: '#0b8a74',
};
export const inr = (v: unknown, dec = 0) =>
  (Number(v) < 0 ? '−₹' : '₹') + Math.abs(Number(v ?? 0)).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
export const fmtDate = (v?: string | null) =>
  v ? new Date(v.length === 10 ? v + 'T00:00:00' : v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
