'use client';
import MasterPage from '@/components/MasterPage';
import { fmtDate, inr2 } from '@/lib/client';
const TYPES = ['CASH', 'BANK', 'UPI_WALLET', 'CREDIT_CARD', 'LOAN'].map(t => ({ value: t, label: t.replace('_', ' ') }));
export default function Accounts() {
  return <MasterPage title="Accounts & Balances" endpoint="/api/accounts" defaults={{ type: 'BANK', opening_balance: 0, active: true }}
    columns={[{ key: 'name', label: 'Account' }, { key: 'type', label: 'Type' },
      { key: 'bank_name', label: 'Bank', render: r => r.bank_name ? `${r.bank_name}${r.account_no_last4 ? ' ••' + r.account_no_last4 : ''}` : '—' },
      { key: 'opening_balance', label: 'Opening', num: true, render: r => <>{inr2(r.opening_balance)}<div className="muted" style={{ fontSize: 11 }}>{fmtDate(r.opening_date)}</div></> },
      { key: 'total_in', label: 'Total in', num: true, render: r => <span className="in">{inr2(r.total_in)}</span> },
      { key: 'total_out', label: 'Total out', num: true, render: r => <span className="out">{inr2(r.total_out)}</span> },
      { key: 'balance', label: 'Balance', num: true, render: r => <b className={r.balance < 0 ? 'out' : ''}>{inr2(r.balance)}</b> }]}
    fields={[{ name: 'name', label: 'Account name', required: true }, { name: 'type', label: 'Type', type: 'select', options: TYPES, required: true },
      { name: 'bank_name', label: 'Bank name' }, { name: 'account_no_last4', label: 'A/c no. last 4 digits' },
      { name: 'opening_balance', label: 'Opening balance', type: 'number' }, { name: 'opening_date', label: 'Opening date', type: 'date' },
      { name: 'active', label: 'Active', type: 'checkbox' }]} />;
}
