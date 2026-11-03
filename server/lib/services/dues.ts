import { query, one, tx } from '../db';
import { HttpError } from '../auth';

export const listDues = (org: number, kind?: string, status?: string) => query(
  `SELECT * FROM v_due_status WHERE org_id=$1 AND ($2::text IS NULL OR kind::text=$2)
     AND ($3::text IS NULL OR ($3='OPEN' AND status IN ('OPEN','PARTIAL')) OR status::text=$3)
   ORDER BY CASE WHEN status IN ('OPEN','PARTIAL') THEN 0 ELSE 1 END, due_date`, [org, kind ?? null, status ?? null]);

export async function getDue(org: number, id: number) {
  const d = await one(`SELECT * FROM v_due_status WHERE org_id=$1 AND id=$2`, [org, id]);
  if (!d) throw new HttpError(404, 'Not found');
  const payments = await query(`SELECT t.*, a.name AS account FROM transactions t JOIN accounts a ON a.id=t.account_id
                                 WHERE t.due_id=$1 ORDER BY t.txn_date`, [id]);
  return { ...d, payments };
}

export const createDue = (org: number, uid: number, d: any) => one(
  `INSERT INTO dues(org_id,kind,party_id,category_id,doc_no,description,amount,issue_date,due_date,created_by)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
  [org, d.kind, d.party_id, d.category_id, d.doc_no, d.description, d.amount, d.issue_date, d.due_date, uid]);

/** Record a (part) payment received/made against an invoice or bill */
export async function settleDue(org: number, uid: number, id: number, s: any) {
  return tx(async c => {
    const { rows: [d] } = await c.query(`SELECT * FROM dues WHERE id=$1 AND org_id=$2 FOR UPDATE`, [id, org]);
    if (!d) throw new HttpError(404, 'Not found');
    if (!['OPEN', 'PARTIAL'].includes(d.status)) throw new HttpError(422, `This ${d.kind.toLowerCase()} is ${d.status}`);
    const { rows: [t] } = await c.query(
      `INSERT INTO transactions(org_id,txn_date,direction,amount,account_id,category_id,party_id,due_id,payment_mode,reference,notes,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [org, s.txn_date, d.kind === 'RECEIVABLE' ? 'IN' : 'OUT', s.amount, s.account_id, d.category_id, d.party_id, id,
       s.payment_mode, s.reference, `${d.kind === 'RECEIVABLE' ? 'Received' : 'Paid'} against ${d.doc_no ?? 'due #' + id}`, uid]);
    return t; // trigger refresh_due_status() updates OPEN → PARTIAL → PAID and blocks over-payment
  });
}

export async function cancelDue(org: number, id: number) {
  const r = await one(`UPDATE dues SET status='CANCELLED' WHERE id=$1 AND org_id=$2 AND status='OPEN' RETURNING *`, [id, org]);
  if (!r) throw new HttpError(422, 'Only unpaid (OPEN) items can be cancelled');
  return r;
}
