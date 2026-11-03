import { query, tx } from '../db';
import { nextOccurrence, today } from '../dates';

export const listRecurring = (org: number) => query(
  `SELECT r.*, a.name AS account, c.name AS category, p.name AS party FROM recurring_rules r
     JOIN accounts a ON a.id=r.account_id LEFT JOIN categories c ON c.id=r.category_id LEFT JOIN parties p ON p.id=r.party_id
    WHERE r.org_id=$1 ORDER BY r.active DESC, r.next_date`, [org]);

/**
 * Post every auto-post rule whose next_date <= today (catches up missed periods).
 * Safe to run repeatedly — call from a daily cron (e.g. Vercel Cron / pg_cron hitting POST /api/recurring/run).
 */
export async function runRecurring(org: number | null, uid: number | null) {
  return tx(async c => {
    const { rows: rules } = await c.query(
      `SELECT * FROM recurring_rules WHERE active AND auto_post AND next_date <= $1 AND ($2::int IS NULL OR org_id=$2) FOR UPDATE`,
      [today(), org]);
    let posted = 0;
    for (const r of rules) {
      let d: string = r.next_date;
      while (d <= today() && (!r.end_date || d <= r.end_date)) {
        await c.query(
          `INSERT INTO transactions(org_id,txn_date,direction,amount,account_id,category_id,party_id,recurring_id,payment_mode,notes,created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'BANK',$9,$10)`,
          [r.org_id, d, r.direction, r.amount, r.account_id, r.category_id, r.party_id, r.id, `Auto: ${r.title}`, uid]);
        posted++; d = nextOccurrence(d, r.frequency);
      }
      await c.query(`UPDATE recurring_rules SET next_date=$2, active = ($3::date IS NULL OR $2 <= $3) WHERE id=$1`, [r.id, d, r.end_date]);
    }
    return { posted };
  });
}
