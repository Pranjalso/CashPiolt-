import { api } from '@/lib/api';
import { requireRole, FINANCE, HttpError } from '@/lib/auth';
import { one } from '@/lib/db';
import { recurringSchema } from '@/lib/validators';
export const PUT = api(async (req, { params }) => {
  const s = await requireRole(...FINANCE); const d = recurringSchema.parse(await req.json());
  const r = await one(`UPDATE recurring_rules SET title=$3,direction=$4,amount=$5,account_id=$6,category_id=$7,party_id=$8,frequency=$9,
                        next_date=$10,end_date=$11,auto_post=$12,active=$13 WHERE id=$1 AND org_id=$2 RETURNING *`,
    [Number(params.id), s.orgId, d.title, d.direction, d.amount, d.account_id, d.category_id, d.party_id, d.frequency, d.next_date, d.end_date, d.auto_post, d.active]);
  if (!r) throw new HttpError(404, 'Not found');
  return r;
});
