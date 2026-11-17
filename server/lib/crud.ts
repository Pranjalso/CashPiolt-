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
    delete: async (org: number, id: number) => {
      // Pre-check for helpful dependency context before deletion
      if (table === 'categories') {
        const [{ count: txnCount }] = await query(
          `SELECT COUNT(*)::int AS count FROM transactions WHERE org_id=$1 AND category_id=$2`, [org, id]);
        if (txnCount > 0) {
          throw new HttpError(422, `Cannot delete category: it is referenced by ${txnCount} cash book transaction(s). Deactivate it instead to keep transaction history intact.`);
        }
        const [{ count: duesCount }] = await query(
          `SELECT COUNT(*)::int AS count FROM dues WHERE org_id=$1 AND category_id=$2`, [org, id]);
        if (duesCount > 0) {
          throw new HttpError(422, `Cannot delete category: it is referenced by ${duesCount} invoice(s)/bill(s).`);
        }
        const [{ count: ruleCount }] = await query(
          `SELECT COUNT(*)::int AS count FROM recurring_rules WHERE org_id=$1 AND category_id=$2`, [org, id]);
        if (ruleCount > 0) {
          throw new HttpError(422, `Cannot delete category: it is referenced by ${ruleCount} recurring rule(s). Please update or delete those rules first.`);
        }
      } else if (table === 'accounts') {
        const [{ count: txnCount }] = await query(
          `SELECT COUNT(*)::int AS count FROM transactions WHERE org_id=$1 AND account_id=$2`, [org, id]);
        if (txnCount > 0) {
          throw new HttpError(422, `Cannot delete account: it has ${txnCount} cash book transaction(s) recorded. Deactivate it instead to preserve ledger audit history.`);
        }
        const [{ count: ruleCount }] = await query(
          `SELECT COUNT(*)::int AS count FROM recurring_rules WHERE org_id=$1 AND account_id=$2`, [org, id]);
        if (ruleCount > 0) {
          throw new HttpError(422, `Cannot delete account: it is linked to ${ruleCount} active recurring rule(s).`);
        }
      } else if (table === 'parties') {
        const [{ count: txnCount }] = await query(
          `SELECT COUNT(*)::int AS count FROM transactions WHERE org_id=$1 AND party_id=$2`, [org, id]);
        if (txnCount > 0) {
          throw new HttpError(422, `Cannot delete customer/vendor: they have ${txnCount} linked transaction(s).`);
        }
        const [{ count: duesCount }] = await query(
          `SELECT COUNT(*)::int AS count FROM dues WHERE org_id=$1 AND party_id=$2`, [org, id]);
        if (duesCount > 0) {
          throw new HttpError(422, `Cannot delete customer/vendor: they are linked to ${duesCount} invoice(s)/bill(s).`);
        }
      }

      const r = await one(`DELETE FROM ${table} WHERE org_id=$1 AND id=$2 RETURNING id`, [org, id]);
      if (!r) throw new HttpError(404, 'Not found');
      return { ok: true, id };
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
