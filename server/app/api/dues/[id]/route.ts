import { api } from '@/lib/api';
import { requireRole, READERS } from '@/lib/auth';
import { getDue } from '@/lib/services/dues';
export const GET = api(async (_r, { params }) => { const s = await requireRole(...READERS); return getDue(s.orgId, Number(params.id)); });
