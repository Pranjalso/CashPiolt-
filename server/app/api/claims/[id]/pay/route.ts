import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { claimPaySchema } from '@/lib/validators';
import { payClaim } from '@/lib/services/claims';
export const POST = api(async (req, { params }) => {
  const s = await requireRole('OWNER', 'ACCOUNTANT');
  return payClaim(s, Number(params.id), claimPaySchema.parse(await req.json()));
});
