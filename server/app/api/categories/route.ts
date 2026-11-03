import { api } from '@/lib/api';
import { requireRole, FINANCE } from '@/lib/auth';
import { categories } from '@/lib/crud';
import { categorySchema } from '@/lib/validators';
export const dynamic = 'force-dynamic';
export const GET = api(async () => { const s = await requireRole(); return categories.list(s.orgId); });
export const POST = api(async req => { const s = await requireRole(...FINANCE); return categories.create(s.orgId, categorySchema.parse(await req.json())); });
