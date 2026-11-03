import { api } from '@/lib/api';
import { requireRole, FINANCE } from '@/lib/auth';
import { cancelDue } from '@/lib/services/dues';
export const POST = api(async (_r, { params }) => { const s = await requireRole(...FINANCE); return cancelDue(s.orgId, Number(params.id)); });
