import { api } from '@/lib/api';
import { requireRole, FINANCE } from '@/lib/auth';
import { categories } from '@/lib/crud';
import { categorySchema } from '@/lib/validators';
export const PUT = api(async (req, { params }) => {
  const s = await requireRole(...FINANCE);
  return categories.update(s.orgId, Number(params.id), categorySchema.partial().parse(await req.json()));
});

export const DELETE = api(async (_req, { params }) => {
  const s = await requireRole(...FINANCE);
  return categories.delete(s.orgId, Number(params.id));
});
