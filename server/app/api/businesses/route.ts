import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { one } from '@/lib/db';
import { businessSchema } from '@/lib/validators';
export const dynamic = 'force-dynamic';
/** Add another business owned by the current user */
export const POST = api(async req => {
  const s = await requireRole();
  const d = businessSchema.parse(await req.json());
  const { id } = (await one(`SELECT create_business($1,$2,$3,$4) AS id`, [d.name, d.business_type, s.uid, d.currency]))!;
  return one(`UPDATE organizations SET gstin=$2, fy_start_month=$3, low_cash_alert=$4 WHERE id=$1 RETURNING *`,
    [id, d.gstin, d.fy_start_month, d.low_cash_alert]);
});
