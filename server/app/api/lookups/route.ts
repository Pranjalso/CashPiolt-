import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
export const dynamic = 'force-dynamic';
/** Dropdown data. Employees get only expense categories (for claims). */
export const GET = api(async () => {
  const s = await requireRole();
  const categories = await query(`SELECT id, name, direction, activity, color FROM categories WHERE org_id=$1 AND active
                                   AND ($2 OR direction='OUT') ORDER BY direction, name`, [s.orgId, s.role !== 'EMPLOYEE']);
  if (s.role === 'EMPLOYEE') return { categories, accounts: [], parties: [] };
  const [accounts, parties] = await Promise.all([
    query(`SELECT id, name, type FROM accounts WHERE org_id=$1 AND active ORDER BY name`, [s.orgId]),
    query(`SELECT id, name, kind FROM parties WHERE org_id=$1 ORDER BY name`, [s.orgId]),
  ]);
  return { categories, accounts, parties };
});
