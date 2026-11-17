import { api } from '@/lib/api';
import { requireRole, FINANCE } from '@/lib/auth';
import { accounts } from '@/lib/crud';
import { accountSchema } from '@/lib/validators';
export const PUT = api(async (req, { params }) => {
  const s = await requireRole(...FINANCE);
  return accounts.update(s.orgId, Number(params.id), accountSchema.partial().parse(await req.json()));
});

export const DELETE = api(async (_req, { params }) => {
  const s = await requireRole(...FINANCE);
  return accounts.delete(s.orgId, Number(params.id));
});
