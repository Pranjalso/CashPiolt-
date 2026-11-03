import { api } from '@/lib/api';
import { requireRole, FINANCE } from '@/lib/auth';
import { parties } from '@/lib/crud';
import { partySchema } from '@/lib/validators';
export const dynamic = 'force-dynamic';
export const GET = api(async () => { const s = await requireRole(); return parties.list(s.orgId); });
export const POST = api(async req => { const s = await requireRole(...FINANCE); return parties.create(s.orgId, partySchema.parse(await req.json())); });
