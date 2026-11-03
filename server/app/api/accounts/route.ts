import { api } from '@/lib/api';
import { requireRole, FINANCE, READERS } from '@/lib/auth';
import { accounts } from '@/lib/crud';
import { accountSchema } from '@/lib/validators';
import { accountBalances } from '@/lib/services/cashbook';
export const dynamic = 'force-dynamic';
export const GET = api(async () => { const s = await requireRole(...READERS); return accountBalances(s.orgId); });
export const POST = api(async req => { const s = await requireRole(...FINANCE); return accounts.create(s.orgId, accountSchema.parse(await req.json())); });
