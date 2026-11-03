import { api } from '@/lib/api';
import { requireRole, FINANCE, READERS } from '@/lib/auth';
import { one } from '@/lib/db';
import { recurringSchema } from '@/lib/validators';
import { listRecurring } from '@/lib/services/recurring';
export const dynamic = 'force-dynamic';
export const GET = api(async () => { const s = await requireRole(...READERS); return listRecurring(s.orgId); });
export const POST = api(async req => {
  const s = await requireRole(...FINANCE); const d = recurringSchema.parse(await req.json());
  return one(`INSERT INTO recurring_rules(org_id,title,direction,amount,account_id,category_id,party_id,frequency,next_date,end_date,auto_post,active)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [s.orgId, d.title, d.direction, d.amount, d.account_id, d.category_id, d.party_id, d.frequency, d.next_date, d.end_date, d.auto_post, d.active]);
});
