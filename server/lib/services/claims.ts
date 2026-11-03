import { query, one, tx } from '../db';
import { HttpError } from '../auth';
import type { Session } from '../session';
import { today } from '../dates';

const APPROVERS = ['OWNER', 'ACCOUNTANT'];
const canSeeAll = (s: Session) => s.role !== 'EMPLOYEE';

export const listClaims = (s: Session, status?: string) => query(
  `SELECT ec.id, ec.claim_no, ec.title, ec.status, ec.total, ec.approved_amount, ec.submitted_at, ec.reviewed_at, ec.paid_at,
          ec.created_at, u.name AS employee, r.name AS reviewer,
          (SELECT COUNT(*) FROM expense_claim_items i WHERE i.claim_id=ec.id) AS items
     FROM expense_claims ec JOIN users u ON u.id=ec.employee_id LEFT JOIN users r ON r.id=ec.reviewed_by
    WHERE ec.org_id=$1 AND ($2::int IS NULL OR ec.employee_id=$2) AND ($3::text IS NULL OR ec.status::text=$3)
    ORDER BY CASE ec.status WHEN 'SUBMITTED' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END, ec.id DESC`,
  [s.orgId, canSeeAll(s) ? null : s.uid, status ?? null]);

export async function getClaim(s: Session, id: number) {
  const c = await one(
    `SELECT ec.*, u.name AS employee, u.email AS employee_email, r.name AS reviewer, a.name AS paid_from
       FROM expense_claims ec JOIN users u ON u.id=ec.employee_id LEFT JOIN users r ON r.id=ec.reviewed_by
       LEFT JOIN transactions t ON t.id=ec.paid_txn_id LEFT JOIN accounts a ON a.id=t.account_id
      WHERE ec.org_id=$1 AND ec.id=$2`, [s.orgId, id]);
  if (!c || (!canSeeAll(s) && c.employee_id !== s.uid)) throw new HttpError(404, 'Claim not found');
  const items = await query(
    `SELECT i.*, cat.name AS category FROM expense_claim_items i JOIN categories cat ON cat.id=i.category_id
      WHERE claim_id=$1 ORDER BY expense_date, i.id`, [id]);
  return { ...c, items };
}

async function writeItems(c: any, org: number, claimId: number, items: any[]) {
  await c.query(`DELETE FROM expense_claim_items WHERE claim_id=$1`, [claimId]);
  for (const i of items) {
    const { rows: [cat] } = await c.query(`SELECT direction FROM categories WHERE id=$1 AND org_id=$2`, [i.category_id, org]);
    if (!cat || cat.direction !== 'OUT') throw new HttpError(422, 'Claim lines must use an expense category');
    if (i.expense_date > today()) throw new HttpError(422, 'Expense date cannot be in the future');
    await c.query(
      `INSERT INTO expense_claim_items(claim_id,expense_date,category_id,description,amount,receipt_url,receipt_mime)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [claimId, i.expense_date, i.category_id, i.description, i.amount, i.receipt_url ?? null, i.receipt_mime ?? null]);
  }
  const total = items.reduce((t, i) => t + Number(i.amount), 0);
  await c.query(`UPDATE expense_claims SET total=$2 WHERE id=$1`, [claimId, total.toFixed(2)]);
}

export async function createClaim(s: Session, d: any) {
  return tx(async c => {
    const { rows: [claim] } = await c.query(
      `INSERT INTO expense_claims(org_id,claim_no,employee_id,title,status,submitted_at)
       VALUES ($1,next_claim_no($1),$2,$3,$4,$5) RETURNING *`,
      [s.orgId, s.uid, d.title, d.submit ? 'SUBMITTED' : 'DRAFT', d.submit ? new Date() : null]);
    await writeItems(c, s.orgId, claim.id, d.items);
    return claim;
  });
}

async function lock(c: any, s: Session, id: number) {
  const { rows: [claim] } = await c.query(`SELECT * FROM expense_claims WHERE id=$1 AND org_id=$2 FOR UPDATE`, [id, s.orgId]);
  if (!claim) throw new HttpError(404, 'Claim not found');
  return claim;
}

/** Employee edits own DRAFT or REJECTED claim (re-submit allowed) */
export async function updateClaim(s: Session, id: number, d: any) {
  return tx(async c => {
    const claim = await lock(c, s, id);
    if (claim.employee_id !== s.uid) throw new HttpError(403, 'Only the employee who raised the claim can edit it');
    if (!['DRAFT', 'REJECTED'].includes(claim.status)) throw new HttpError(422, `A ${claim.status} claim cannot be edited`);
    await c.query(`UPDATE expense_claims SET title=$2, status=$3, submitted_at=$4, reviewed_by=NULL, reviewed_at=NULL, review_note=NULL,
                   approved_amount=NULL WHERE id=$1`, [id, d.title, d.submit ? 'SUBMITTED' : 'DRAFT', d.submit ? new Date() : null]);
    await writeItems(c, s.orgId, id, d.items);
    return { ok: true };
  });
}

export async function submitClaim(s: Session, id: number) {
  return tx(async c => {
    const claim = await lock(c, s, id);
    if (claim.employee_id !== s.uid) throw new HttpError(403, 'Not your claim');
    if (!['DRAFT', 'REJECTED'].includes(claim.status)) throw new HttpError(422, `Claim is already ${claim.status}`);
    const { rows: [r] } = await c.query(`UPDATE expense_claims SET status='SUBMITTED', submitted_at=now() WHERE id=$1 RETURNING *`, [id]);
    return r;
  });
}

export async function reviewClaim(s: Session, id: number, approve: boolean, d: { approved_amount?: number; note: string | null }) {
  if (!APPROVERS.includes(s.role)) throw new HttpError(403, 'Only owner/accountant can review claims');
  return tx(async c => {
    const claim = await lock(c, s, id);
    if (claim.status !== 'SUBMITTED') throw new HttpError(422, `Only SUBMITTED claims can be reviewed (is ${claim.status})`);
    if (claim.employee_id === s.uid) throw new HttpError(403, 'You cannot approve your own claim');
    if (!approve && !d.note) throw new HttpError(400, 'Give a reason for rejection');
    const amt = approve ? d.approved_amount ?? Number(claim.total) : null;
    if (amt !== null && amt > Number(claim.total)) throw new HttpError(422, 'Approved amount cannot exceed claimed total');
    const { rows: [r] } = await c.query(
      `UPDATE expense_claims SET status=$2, approved_amount=$3, review_note=$4, reviewed_by=$5, reviewed_at=now() WHERE id=$1 RETURNING *`,
      [id, approve ? 'APPROVED' : 'REJECTED', amt, d.note, s.uid]);
    return r;
  });
}

/** Reimburse: one OUT transaction in the cash book, categorised by the claim's largest category */
export async function payClaim(s: Session, id: number, d: any) {
  if (!APPROVERS.includes(s.role)) throw new HttpError(403, 'Only owner/accountant can pay claims');
  return tx(async c => {
    const claim = await lock(c, s, id);
    if (claim.status !== 'APPROVED') throw new HttpError(422, `Only APPROVED claims can be paid (is ${claim.status})`);
    const { rows: [top] } = await c.query(
      `SELECT category_id FROM expense_claim_items WHERE claim_id=$1 GROUP BY category_id ORDER BY SUM(amount) DESC LIMIT 1`, [id]);
    const { rows: [emp] } = await c.query(`SELECT name FROM users WHERE id=$1`, [claim.employee_id]);
    const { rows: [t] } = await c.query(
      `INSERT INTO transactions(org_id,txn_date,direction,amount,account_id,category_id,claim_id,payment_mode,reference,notes,created_by)
       VALUES ($1,$2,'OUT',$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [s.orgId, d.txn_date ?? today(), claim.approved_amount, d.account_id, top.category_id, id, d.payment_mode, d.reference,
       `Reimbursement ${claim.claim_no} – ${emp.name}`, s.uid]);
    const { rows: [r] } = await c.query(
      `UPDATE expense_claims SET status='PAID', paid_txn_id=$2, paid_at=now() WHERE id=$1 RETURNING *`, [id, t.id]);
    return r;
  });
}
