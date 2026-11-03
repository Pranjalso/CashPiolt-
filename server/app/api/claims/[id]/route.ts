import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { claimSchema } from '@/lib/validators';
import { getClaim, updateClaim } from '@/lib/services/claims';
export const GET = api(async (_r, { params }) => { const s = await requireRole(); return getClaim(s, Number(params.id)); });
export const PUT = api(async (req, { params }) => { const s = await requireRole(); return updateClaim(s, Number(params.id), claimSchema.parse(await req.json())); });
