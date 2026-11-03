import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { one } from '@/lib/db';
import { businessSchema } from '@/lib/validators';
export const dynamic = 'force-dynamic';
export const GET = api(async () => { const s = await requireRole(); return one(`SELECT * FROM organizations WHERE id=$1`, [s.orgId]); });
export const PUT = api(async req => {
  const s = await requireRole('OWNER');
  const d = businessSchema.parse(await req.json());
  return one(`UPDATE organizations SET name=$2, business_type=$3, currency=$4, gstin=$5, fy_start_month=$6, low_cash_alert=$7
              WHERE id=$1 RETURNING *`, [s.orgId, d.name, d.business_type, d.currency, d.gstin, d.fy_start_month, d.low_cash_alert]);
});
