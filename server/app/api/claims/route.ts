import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { claimSchema } from '@/lib/validators';
import { createClaim, listClaims } from '@/lib/services/claims';
export const dynamic = 'force-dynamic';
// Employees see only their own claims; owner/accountant/viewer see all
export const GET = api(async req => { const s = await requireRole(); return listClaims(s, new URL(req.url).searchParams.get('status') ?? undefined); });
export const POST = api(async req => { const s = await requireRole('OWNER', 'ACCOUNTANT', 'EMPLOYEE'); return createClaim(s, claimSchema.parse(await req.json())); });
