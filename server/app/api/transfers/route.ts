import { api } from '@/lib/api';
import { requireRole, FINANCE } from '@/lib/auth';
import { transferSchema } from '@/lib/validators';
import { createTransfer } from '@/lib/services/cashbook';
import { withIdempotency } from '@/lib/idempotency';

export const POST = api(async req => {
  const s = await requireRole(...FINANCE);
  return withIdempotency(req, s.orgId, s.uid, '/api/transfers', async () => {
    return createTransfer(s.orgId, s.uid, transferSchema.parse(await req.json()));
  });
});
