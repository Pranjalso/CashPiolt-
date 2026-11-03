import { randomUUID } from 'crypto';
import { query, one, tx } from '../db';
import { HttpError } from '../auth';
import { audit } from '../crud';

export type TxnFilter = { from?: string; to?: string; account_id?: number; category_id?: number; party_id?: number;
  direction?: string; q?: string; page?: number; size?: number };

export async function listTransactions(org: number, f: TxnFilter) {
  const size = Math.min(f.size ?? 50, 200), page = Math.max(f.page ?? 1, 1);
  const where = `t.org_id=$1
    AND ($2::date IS NULL OR t.txn_date >= $2) AND ($3::date IS NULL OR t.txn_date <= $3)
    AND ($4::int IS NULL OR t.account_id=$4) AND ($5::int IS NULL OR t.category_id=$5)
    AND ($6::int IS NULL OR t.party_id=$6) AND ($7::text IS NULL OR t.direction::text=$7)
    AND ($8::text IS NULL OR t.notes ILIKE '%'||$8||'%' OR t.reference ILIKE '%'||$8||'%' OR p.name ILIKE '%'||$8||'%' OR c.name ILIKE '%'||$8||'%')`;
  const params = [org, f.from ?? null, f.to ?? null, f.account_id ?? null, f.category_id ?? null, f.party_id ?? null, f.direction ?? null, f.q || null];
  const rows = await query(
    `SELECT t.*, a.name AS account, c.name AS category, c.color, p.name AS party, d.doc_no, ec.claim_no
       FROM transactions t JOIN accounts a ON a.id=t.account_id
       LEFT JOIN categories c ON c.id=t.category_id LEFT JOIN parties p ON p.id=t.party_id
       LEFT JOIN dues d ON d.id=t.due_id LEFT JOIN expense_claims ec ON ec.id=t.claim_id
      WHERE ${where} ORDER BY t.txn_date DESC, t.id DESC LIMIT ${size} OFFSET ${(page - 1) * size}`, params);
  const tot = await one(
    `SELECT COUNT(*) AS count,
            COALESCE(SUM(CASE WHEN t.direction='IN' AND t.transfer_group IS NULL THEN t.amount END),0) AS total_in,
            COALESCE(SUM(CASE WHEN t.direction='OUT' AND t.transfer_group IS NULL THEN t.amount END),0) AS total_out
       FROM transactions t LEFT JOIN categories c ON c.id=t.category_id LEFT JOIN parties p ON p.id=t.party_id WHERE ${where}`, params);
  return { rows, page, size, ...tot };
}

export async function createTransaction(org: number, uid: number, d: any) {
  const cat = await one(`SELECT direction FROM categories WHERE id=$1 AND org_id=$2`, [d.category_id, org]);
  if (!cat) throw new HttpError(422, 'Unknown category');
  if (cat.direction !== d.direction) throw new HttpError(422, `Category is for ${cat.direction === 'IN' ? 'income' : 'expenses'}`);
  const t = await one(
    `INSERT INTO transactions(org_id,txn_date,direction,amount,account_id,category_id,party_id,payment_mode,reference,notes,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [org, d.txn_date, d.direction, d.amount, d.account_id, d.category_id, d.party_id, d.payment_mode, d.reference, d.notes, uid]);
  await audit(org, uid, 'CREATE', 'transaction', t.id, { amount: d.amount, direction: d.direction });
  return t;
}

export async function updateTransaction(org: number, uid: number, id: number, d: any) {
  const cur = await one(`SELECT * FROM transactions WHERE id=$1 AND org_id=$2`, [id, org]);
  if (!cur) throw new HttpError(404, 'Not found');
  if (cur.transfer_group || cur.claim_id) throw new HttpError(422, 'Transfers and claim reimbursements cannot be edited; delete and re-enter the transfer');
  const cat = await one(`SELECT direction FROM categories WHERE id=$1 AND org_id=$2`, [d.category_id, org]);
  if (!cat || cat.direction !== cur.direction) throw new HttpError(422, 'Category does not match income/expense type');
  const r = await one(
    `UPDATE transactions SET txn_date=$3, amount=$4, account_id=$5, category_id=$6, party_id=$7, payment_mode=$8, reference=$9, notes=$10
      WHERE id=$1 AND org_id=$2 RETURNING *`,
    [id, org, d.txn_date, d.amount, d.account_id, d.category_id, d.party_id, d.payment_mode, d.reference, d.notes]);
  await audit(org, uid, 'UPDATE', 'transaction', id, { before: cur, after: r });
  return r;
}

export async function deleteTransaction(org: number, uid: number, id: number) {
  return tx(async c => {
    const { rows: [t] } = await c.query(`SELECT * FROM transactions WHERE id=$1 AND org_id=$2`, [id, org]);
    if (!t) throw new HttpError(404, 'Not found');
    if (t.claim_id) throw new HttpError(422, 'This is an expense-claim reimbursement; it cannot be deleted');
    // a transfer is deleted as a pair
    if (t.transfer_group) await c.query(`DELETE FROM transactions WHERE transfer_group=$1 AND org_id=$2`, [t.transfer_group, org]);
    else await c.query(`DELETE FROM transactions WHERE id=$1`, [id]);
    await c.query(`INSERT INTO audit_log(org_id,user_id,action,entity,entity_id,detail) VALUES ($1,$2,'DELETE','transaction',$3,$4)`,
      [org, uid, String(id), JSON.stringify(t)]);
    return { ok: true };
  });
}

export async function createTransfer(org: number, uid: number, d: any) {
  return tx(async c => {
    const g = randomUUID();
    for (const [dir, acc] of [['OUT', d.from_account_id], ['IN', d.to_account_id]])
      await c.query(
        `INSERT INTO transactions(org_id,txn_date,direction,amount,account_id,transfer_group,payment_mode,reference,notes,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,'BANK',$7,$8,$9)`,
        [org, d.txn_date, dir, d.amount, acc, g, d.reference, d.notes ?? 'Account transfer', uid]);
    return { transfer_group: g };
  });
}

export const accountBalances = (org: number) =>
  query(`SELECT b.*, a.bank_name, a.account_no_last4, a.active, a.opening_date FROM v_account_balances b
           JOIN accounts a ON a.id=b.account_id WHERE b.org_id=$1 ORDER BY a.type, a.name`, [org]);
