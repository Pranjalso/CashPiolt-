import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { HttpError } from './auth';

type Ctx = { params: Record<string, string> };

export function api(fn: (req: Request, ctx: Ctx) => Promise<unknown>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      const out = await fn(req, ctx);
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true });
    } catch (e: any) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError)
        return NextResponse.json({ error: e.issues.map(i => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ') }, { status: 400 });
      if (e?.code === '23505') return NextResponse.json({ error: 'Already exists: ' + (e.detail ?? '') }, { status: 409 });
      if (e?.code === '23514') return NextResponse.json({ error: e.message }, { status: 422 });
      if (e?.code === '23503') {
        const detail = e.detail || '';
        let msg = 'Cannot delete or modify: this record is still referenced by existing transactions, dues, or recurring rules.';
        if (detail.includes('transactions')) {
          msg = 'Cannot delete: this record is linked to existing transactions in the cash book. Deactivate it instead to preserve ledger audit history.';
        } else if (detail.includes('dues')) {
          msg = 'Cannot delete: this record is linked to pending or past invoices/bills (dues).';
        } else if (detail.includes('recurring_rules')) {
          msg = 'Cannot delete: this record is referenced by one or more recurring rules.';
        } else if (detail.includes('expense_claim_items')) {
          msg = 'Cannot delete: this record is referenced by existing expense claims.';
        } else if (detail.includes('budgets')) {
          msg = 'Cannot delete: this category is referenced by active monthly budgets.';
        }
        return NextResponse.json({ error: msg, detail }, { status: 422 });
      }
      console.error(e);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
export const num = (v: string | null) => (v ? Number(v) : undefined);
