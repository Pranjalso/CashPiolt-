import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { reviewSchema } from '@/lib/validators';
import { reviewClaim } from '@/lib/services/claims';
export const POST = api(async (req, { params }) => {
  const s = await requireRole('OWNER', 'ACCOUNTANT');
  return reviewClaim(s, Number(params.id), true, reviewSchema.parse(await req.json().catch(() => ({}))));
});
