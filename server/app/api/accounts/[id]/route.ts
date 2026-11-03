import { api } from '@/lib/api';
import { requireRole, FINANCE } from '@/lib/auth';
import { accounts } from '@/lib/crud';
import { accountSchema } from '@/lib/validators';
export const PUT = api(async (req, { params }) => {
  const s = await requireRole(...FINANCE);
  return accounts.update(s.orgId, Number(params.id), accountSchema.partial().parse(await req.json()));
});
