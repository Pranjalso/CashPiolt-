import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { submitClaim } from '@/lib/services/claims';
export const POST = api(async (_r, { params }) => { const s = await requireRole(); return submitClaim(s, Number(params.id)); });
