import { api } from '@/lib/api';
import { requireRole, FINANCE } from '@/lib/auth';
import { settleSchema } from '@/lib/validators';
import { settleDue } from '@/lib/services/dues';
import { withIdempotency } from '@/lib/idempotency';

export const POST = api(async (req, { params }) => {
  const s = await requireRole(...FINANCE);
  return withIdempotency(req, s.orgId, s.uid, `/api/dues/${params.id}/settle`, async () => {
    return settleDue(s.orgId, s.uid, Number(params.id), settleSchema.parse(await req.json()));
  });
});
