import { api } from '@/lib/api';
import { requireRole, FINANCE, READERS } from '@/lib/auth';
import { tx } from '@/lib/db';
import { budgetSchema } from '@/lib/validators';
import { budgetVsActual } from '@/lib/services/reports';
import { today } from '@/lib/dates';
export const dynamic = 'force-dynamic';
export const GET = api(async req => {
  const s = await requireRole(...READERS);
  return budgetVsActual(s.orgId, new URL(req.url).searchParams.get('month') ?? today().slice(0, 7));
});
export const POST = api(async req => {
  const s = await requireRole(...FINANCE); const d = budgetSchema.parse(await req.json());
  return tx(async c => {
    for (const i of d.items) {
      if (i.amount === 0) await c.query(`DELETE FROM budgets WHERE org_id=$1 AND category_id=$2 AND month=($3||'-01')::date`, [s.orgId, i.category_id, d.month]);
      else await c.query(`INSERT INTO budgets(org_id,category_id,month,amount) VALUES ($1,$2,($3||'-01')::date,$4)
                          ON CONFLICT (org_id,category_id,month) DO UPDATE SET amount=EXCLUDED.amount`, [s.orgId, i.category_id, d.month, i.amount]);
    }
    return { ok: true };
  });
});
