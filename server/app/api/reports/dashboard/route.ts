import { api } from '@/lib/api';
import { requireRole, READERS } from '@/lib/auth';
import { dashboard } from '@/lib/services/reports';
export const dynamic = 'force-dynamic';
export const GET = api(async () => { const s = await requireRole(...READERS); return dashboard(s.orgId); });
