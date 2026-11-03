import { api } from '@/lib/api';
import { requireRole, READERS } from '@/lib/auth';
import { daybook } from '@/lib/services/reports';
import { today } from '@/lib/dates';
export const dynamic = 'force-dynamic';
export const GET = api(async req => { const s = await requireRole(...READERS); return daybook(s.orgId, new URL(req.url).searchParams.get('date') ?? today()); });
