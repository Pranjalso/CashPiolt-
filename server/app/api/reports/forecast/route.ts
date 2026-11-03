import { api } from '@/lib/api';
import { requireRole, READERS } from '@/lib/auth';
import { forecast } from '@/lib/services/reports';
export const dynamic = 'force-dynamic';
export const GET = api(async req => {
  const s = await requireRole(...READERS); const q = new URL(req.url).searchParams;
  const days = Math.min(Math.max(Number(q.get('days') ?? 90), 7), 365);
  return forecast(s.orgId, days, q.get('trend') !== '0');
});
