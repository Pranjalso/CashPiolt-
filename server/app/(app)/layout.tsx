import { requirePage } from '@/lib/auth';
import { query } from '@/lib/db';
import Shell from '@/components/Shell';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requirePage();
  const businesses = await query(
    `SELECT o.id, o.name, m.role FROM memberships m JOIN organizations o ON o.id=m.org_id WHERE m.user_id=$1 ORDER BY o.name`,
    [s.uid]
  );
  const fin = s.role !== 'EMPLOYEE';
  const nav: [string, [string, string][]][] = fin ? [
    ['Overview', [['/', 'Dashboard'], ['/reports', 'Reports & Forecast']]],
    ['Cash book', [['/transactions', 'Transactions'], ['/accounts', 'Accounts & Balances'], ['/recurring', 'Recurring']]],
    ['Dues', [['/dues?kind=RECEIVABLE', 'Receivables'], ['/dues?kind=PAYABLE', 'Payables']]],
    ['Control', [['/claims', 'Expense Claims'], ['/budgets', 'Budgets']]],
    ['Setup', [['/parties', 'Customers & Vendors'], ['/categories', 'Categories'], ['/settings', 'Business & Team']]],
  ] : [['Expense Claims', [['/claims', 'My Claims'], ['/claims/new', 'New Claim']]]];

  return (
    <Shell
      businesses={businesses}
      currentOrgId={s.orgId}
      userName={s.name}
      userRole={s.role}
      nav={nav}
    >
      {children}
    </Shell>
  );
}
