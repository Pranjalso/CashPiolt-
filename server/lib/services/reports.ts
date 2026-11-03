import { query, one } from '../db';
import { addDays, nextOccurrence, today } from '../dates';

const monthStart = (d: string) => d.slice(0, 8) + '01';

export async function dashboard(org: number) {
  const t = today(), ms = monthStart(t);
  const [balances, month, dues, claims, monthly, budgets, upcoming, recent, orgRow] = await Promise.all([
    query(`SELECT account_id, name, type, balance FROM v_account_balances WHERE org_id=$1 ORDER BY balance DESC`, [org]),
    one(`SELECT COALESCE(SUM(amount) FILTER (WHERE direction='IN'),0) AS inflow,
                COALESCE(SUM(amount) FILTER (WHERE direction='OUT'),0) AS outflow
           FROM transactions WHERE org_id=$1 AND transfer_group IS NULL AND txn_date >= $2`, [org, ms]),
    one(`SELECT COALESCE(SUM(outstanding) FILTER (WHERE kind='RECEIVABLE'),0) AS receivable,
                COALESCE(SUM(outstanding) FILTER (WHERE kind='PAYABLE'),0) AS payable,
                COALESCE(SUM(outstanding) FILTER (WHERE kind='RECEIVABLE' AND days_overdue>0),0) AS overdue_receivable,
                COALESCE(SUM(outstanding) FILTER (WHERE kind='PAYABLE' AND days_overdue>0),0) AS overdue_payable
           FROM v_due_status WHERE org_id=$1 AND status IN ('OPEN','PARTIAL')`, [org]),
    one(`SELECT COUNT(*) FILTER (WHERE status='SUBMITTED') AS to_review,
                COUNT(*) FILTER (WHERE status='APPROVED') AS to_pay,
                COALESCE(SUM(approved_amount) FILTER (WHERE status='APPROVED'),0) AS to_pay_amount
           FROM expense_claims WHERE org_id=$1`, [org]),
    query(`SELECT to_char(month,'Mon YY') AS label, month, inflow, outflow, net FROM v_monthly_cashflow
            WHERE org_id=$1 AND month >= ($2::date - interval '11 months') ORDER BY month`, [org, ms]),
    budgetVsActual(org, t.slice(0, 7)),
    query(`SELECT id, kind, doc_no, party_name, outstanding, due_date, days_overdue FROM v_due_status
            WHERE org_id=$1 AND status IN ('OPEN','PARTIAL') ORDER BY due_date LIMIT 8`, [org]),
    query(`SELECT t.id, t.txn_date, t.direction, t.amount, t.transfer_group, c.name AS category, c.color, a.name AS account, p.name AS party
             FROM transactions t JOIN accounts a ON a.id=t.account_id LEFT JOIN categories c ON c.id=t.category_id
             LEFT JOIN parties p ON p.id=t.party_id WHERE t.org_id=$1 ORDER BY t.txn_date DESC, t.id DESC LIMIT 8`, [org]),
    one(`SELECT name, business_type, currency, low_cash_alert FROM organizations WHERE id=$1`, [org]),
  ]);
  const total = balances.reduce((s, b) => s + b.balance, 0);
  const fc = await forecast(org, 30);
  return {
    business: orgRow, total_balance: total, balances, month: { ...month, net: month!.inflow - month!.outflow },
    dues, claims, monthly, budgets, upcoming, recent,
    forecast: { end_balance: fc.end_balance, min_balance: fc.min_balance, min_date: fc.min_date, low_cash_date: fc.low_cash_date },
  };
}

export const budgetVsActual = (org: number, ym: string) => query(
  `SELECT b.category_id, c.name AS category, c.color, b.amount AS budget,
          COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.org_id=$1 AND t.category_id=b.category_id
                     AND t.direction='OUT' AND date_trunc('month', t.txn_date) = b.month),0) AS actual
     FROM budgets b JOIN categories c ON c.id=b.category_id
    WHERE b.org_id=$1 AND b.month = ($2 || '-01')::date ORDER BY c.name`, [org, ym]);

/** Cash flow statement for a period, grouped by activity (direct method) */
export async function statement(org: number, from: string, to: string) {
  const opening = await one(
    `SELECT COALESCE(SUM(a.opening_balance) FILTER (WHERE a.opening_date < $2),0)
          + COALESCE((SELECT SUM(CASE WHEN direction='IN' THEN amount ELSE -amount END) FROM transactions
                       WHERE org_id=$1 AND txn_date < $2),0) AS amount
       FROM accounts a WHERE a.org_id=$1`, [org, from]);
  const newAccounts = await one(
    `SELECT COALESCE(SUM(opening_balance),0) AS amount FROM accounts WHERE org_id=$1 AND opening_date BETWEEN $2 AND $3`, [org, from, to]);
  const lines = await query(
    `SELECT COALESCE(c.activity,'OPERATING') AS activity, t.direction, COALESCE(c.name, 'Uncategorised') AS category, c.color,
            SUM(t.amount) AS amount, COUNT(*) AS count
       FROM transactions t LEFT JOIN categories c ON c.id=t.category_id
      WHERE t.org_id=$1 AND t.transfer_group IS NULL AND t.txn_date BETWEEN $2 AND $3
      GROUP BY 1,2,3,4 ORDER BY 1, 2, amount DESC`, [org, from, to]);
  const act = (a: string) => {
    const ls = lines.filter(l => l.activity === a);
    const inflow = ls.filter(l => l.direction === 'IN').reduce((s, l) => s + l.amount, 0);
    const outflow = ls.filter(l => l.direction === 'OUT').reduce((s, l) => s + l.amount, 0);
    return { lines: ls, inflow, outflow, net: inflow - outflow };
  };
  const operating = act('OPERATING'), investing = act('INVESTING'), financing = act('FINANCING');
  const net = operating.net + investing.net + financing.net;
  return { from, to, opening: opening!.amount + 0, new_accounts: newAccounts!.amount, operating, investing, financing, net,
           closing: opening!.amount + newAccounts!.amount + net };
}

export const categoryBreakdown = (org: number, from: string, to: string, direction: 'IN' | 'OUT') => query(
  `SELECT c.name AS category, c.color, SUM(t.amount) AS amount FROM transactions t JOIN categories c ON c.id=t.category_id
    WHERE t.org_id=$1 AND t.direction=$4 AND t.transfer_group IS NULL AND t.txn_date BETWEEN $2 AND $3
    GROUP BY 1,2 ORDER BY amount DESC`, [org, from, to, direction]);

/**
 * Cash forecast for the next N days =
 *   current balance
 * + open receivables on their due date (overdue ones assumed collected in 7 days)
 * − open payables on their due date (overdue ones assumed paid today)
 * ± every occurrence of active recurring rules
 * + baseline: average daily net of the last 90 days of "ad-hoc" cash (no dues / recurring / transfers / claims)
 */
export async function forecast(org: number, days = 90, includeTrend = true) {
  const t = today(), end = addDays(t, days);
  const [{ total }] = await query(`SELECT COALESCE(SUM(balance),0) AS total FROM v_account_balances WHERE org_id=$1`, [org]);
  const o = await one(`SELECT low_cash_alert FROM organizations WHERE id=$1`, [org]);
  const dues = await query(`SELECT id, kind, doc_no, party_name, outstanding, due_date FROM v_due_status
                             WHERE org_id=$1 AND status IN ('OPEN','PARTIAL') AND due_date <= $2`, [org, end]);
  const rules = await query(`SELECT * FROM recurring_rules WHERE org_id=$1 AND active`, [org]);
  const base = await one(
    `SELECT COALESCE(SUM(CASE WHEN direction='IN' THEN amount ELSE -amount END),0) / 90.0 AS daily
       FROM transactions WHERE org_id=$1 AND txn_date > $2::date - 90 AND txn_date <= $2
        AND due_id IS NULL AND recurring_id IS NULL AND transfer_group IS NULL AND claim_id IS NULL
        AND category_id NOT IN (SELECT category_id FROM recurring_rules WHERE org_id=$1 AND active AND category_id IS NOT NULL)
        AND category_id NOT IN (SELECT id FROM categories WHERE org_id=$1 AND activity <> 'OPERATING')`, [org, t]);
  const daily = includeTrend ? Number(base!.daily) : 0;

  type Ev = { date: string; label: string; amount: number; type: string };
  const events: Ev[] = [];
  for (const d of dues) {
    const sign = d.kind === 'RECEIVABLE' ? 1 : -1;
    const when = d.due_date < t ? (d.kind === 'RECEIVABLE' ? addDays(t, 7) : t) : d.due_date;
    events.push({ date: when, label: `${d.kind === 'RECEIVABLE' ? 'Collect' : 'Pay'} ${d.doc_no ?? ''} ${d.party_name ?? ''}`.trim(), amount: sign * d.outstanding, type: d.kind });
  }
  for (const r of rules) {
    let d: string = r.next_date < t ? t : r.next_date;
    for (let guard = 0; d <= end && (!r.end_date || d <= r.end_date) && guard < 400; guard++) {
      events.push({ date: d, label: r.title, amount: (r.direction === 'IN' ? 1 : -1) * r.amount, type: 'RECURRING' });
      d = nextOccurrence(d, r.frequency);
    }
  }
  events.sort((a, b) => a.date.localeCompare(b.date));

  const series: { date: string; balance: number; in: number; out: number }[] = [];
  let bal = total, min = total, minDate = t, lowDate: string | null = null;
  for (let i = 0; i <= days; i++) {
    const d = addDays(t, i);
    const evs = events.filter(e => e.date === d);
    const inn = evs.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0) + (i > 0 && daily > 0 ? daily : 0);
    const out = -evs.filter(e => e.amount < 0).reduce((s, e) => s + e.amount, 0) + (i > 0 && daily < 0 ? -daily : 0);
    bal += inn - out;
    if (bal < min) { min = bal; minDate = d; }
    if (!lowDate && bal < Number(o!.low_cash_alert)) lowDate = d;
    series.push({ date: d, balance: Math.round(bal), in: Math.round(inn), out: Math.round(out) });
  }
  return { start_balance: total, end_balance: Math.round(bal), min_balance: Math.round(min), min_date: minDate,
           low_cash_alert: o!.low_cash_alert, low_cash_date: lowDate, daily_trend: Math.round(daily), series, events };
}

export const daybook = (org: number, date: string) => query(
  `SELECT t.*, a.name AS account, c.name AS category, p.name AS party FROM transactions t
     JOIN accounts a ON a.id=t.account_id LEFT JOIN categories c ON c.id=t.category_id LEFT JOIN parties p ON p.id=t.party_id
    WHERE t.org_id=$1 AND t.txn_date=$2 ORDER BY t.id`, [org, date]);
