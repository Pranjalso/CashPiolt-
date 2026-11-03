import { query, one } from './db';
import { HttpError } from './auth';

/** Org-scoped CRUD for master tables. Table/column names are fixed in code, never from input. */
export function orgCrud(table: string, cols: string[], order = 'name') {
  return {
    list: (org: number) => query(`SELECT * FROM ${table} WHERE org_id=$1 ORDER BY ${order}`, [org]),
    create: (org: number, d: Record<string, any>) => {
      const c = cols.filter(k => d[k] !== undefined);
      return one(`INSERT INTO ${table}(org_id,${c.join(',')}) VALUES ($1,${c.map((_, i) => `$${i + 2}`).join(',')}) RETURNING *`,
        [org, ...c.map(k => d[k])]);
    },
    update: async (org: number, id: number, d: Record<string, any>) => {
      const c = cols.filter(k => d[k] !== undefined);
      if (!c.length) throw new HttpError(400, 'Nothing to update');
      const r = await one(`UPDATE ${table} SET ${c.map((k, i) => `${k}=$${i + 3}`).join(',')} WHERE org_id=$1 AND id=$2 RETURNING *`,
        [org, id, ...c.map(k => d[k])]);
      if (!r) throw new HttpError(404, 'Not found');
      return r;
    },
  };
}

export const accounts = orgCrud('accounts', ['name', 'type', 'bank_name', 'account_no_last4', 'opening_balance', 'opening_date', 'active']);
export const categories = orgCrud('categories', ['name', 'direction', 'activity', 'color', 'active'], 'direction, name');
export const parties = orgCrud('parties', ['name', 'kind', 'phone', 'email', 'gstin']);

export async function audit(org: number, user: number, action: string, entity: string, entityId: unknown, detail?: unknown) {
  await query(`INSERT INTO audit_log(org_id,user_id,action,entity,entity_id,detail) VALUES ($1,$2,$3,$4,$5,$6)`,
    [org, user, action, entity, String(entityId ?? ''), detail ? JSON.stringify(detail) : null]);
}
