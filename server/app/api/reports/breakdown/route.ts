import { api } from '@/lib/api';
import { requireRole, READERS } from '@/lib/auth';
import { categoryBreakdown } from '@/lib/services/reports';
import { today } from '@/lib/dates';
export const dynamic = 'force-dynamic';
export const GET = api(async req => {
  const s = await requireRole(...READERS); const q = new URL(req.url).searchParams; const t = today();
  return categoryBreakdown(s.orgId, q.get('from') ?? t.slice(0, 8) + '01', q.get('to') ?? t, q.get('direction') === 'IN' ? 'IN' : 'OUT');
});
