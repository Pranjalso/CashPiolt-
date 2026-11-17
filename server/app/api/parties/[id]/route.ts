import { api } from '@/lib/api';
import { requireRole, FINANCE } from '@/lib/auth';
import { parties } from '@/lib/crud';
import { partySchema } from '@/lib/validators';
export const PUT = api(async (req, { params }) => {
  const s = await requireRole(...FINANCE);
  return parties.update(s.orgId, Number(params.id), partySchema.partial().parse(await req.json()));
});

export const DELETE = api(async (_req, { params }) => {
  const s = await requireRole(...FINANCE);
  return parties.delete(s.orgId, Number(params.id));
});
