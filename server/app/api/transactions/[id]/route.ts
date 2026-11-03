import { api } from '@/lib/api';
import { requireRole, FINANCE } from '@/lib/auth';
import { txnSchema } from '@/lib/validators';
import { deleteTransaction, updateTransaction } from '@/lib/services/cashbook';
export const PUT = api(async (req, { params }) => {
  const s = await requireRole(...FINANCE);
  return updateTransaction(s.orgId, s.uid, Number(params.id), txnSchema.parse(await req.json()));
});
export const DELETE = api(async (_r, { params }) => { const s = await requireRole('OWNER'); return deleteTransaction(s.orgId, s.uid, Number(params.id)); });
