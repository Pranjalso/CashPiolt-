import { api, num } from '@/lib/api';
import { requireRole, FINANCE, READERS } from '@/lib/auth';
import { txnSchema } from '@/lib/validators';
import { createTransaction, listTransactions } from '@/lib/services/cashbook';
export const dynamic = 'force-dynamic';
export const GET = api(async req => {
  const s = await requireRole(...READERS);
  const q = new URL(req.url).searchParams;
  return listTransactions(s.orgId, { from: q.get('from') ?? undefined, to: q.get('to') ?? undefined, account_id: num(q.get('account_id')),
    category_id: num(q.get('category_id')), party_id: num(q.get('party_id')), direction: q.get('direction') ?? undefined,
    q: q.get('q') ?? undefined, page: num(q.get('page')), size: num(q.get('size')) });
});
export const POST = api(async req => { const s = await requireRole(...FINANCE); return createTransaction(s.orgId, s.uid, txnSchema.parse(await req.json())); });
