import { api } from '@/lib/api';
import { requireRole, FINANCE, READERS } from '@/lib/auth';
import { dueSchema } from '@/lib/validators';
import { createDue, listDues } from '@/lib/services/dues';
export const dynamic = 'force-dynamic';
export const GET = api(async req => {
  const s = await requireRole(...READERS); const q = new URL(req.url).searchParams;
  return listDues(s.orgId, q.get('kind') ?? undefined, q.get('status') ?? undefined);
});
export const POST = api(async req => { const s = await requireRole(...FINANCE); return createDue(s.orgId, s.uid, dueSchema.parse(await req.json())); });
