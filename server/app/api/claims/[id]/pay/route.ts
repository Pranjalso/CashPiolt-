import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { claimPaySchema } from '@/lib/validators';
import { payClaim } from '@/lib/services/claims';
import { withIdempotency } from '@/lib/idempotency';

export const POST = api(async (req, { params }) => {
  const s = await requireRole('OWNER', 'ACCOUNTANT');
  return withIdempotency(req, s.orgId, s.uid, `/api/claims/${params.id}/pay`, async () => {
    return payClaim(s, Number(params.id), claimPaySchema.parse(await req.json()));
  });
});
