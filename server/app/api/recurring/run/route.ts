import { api } from '@/lib/api';
import { requireRole, FINANCE, HttpError } from '@/lib/auth';
import { runRecurring } from '@/lib/services/recurring';
/** Users: posts due entries for the current business.
 *  Cron: call with header "x-cron-secret: $CRON_SECRET" to post for ALL businesses. */
export const POST = api(async req => {
  const cron = req.headers.get('x-cron-secret');
  if (cron) {
    if (!process.env.CRON_SECRET || cron !== process.env.CRON_SECRET) throw new HttpError(401, 'Bad cron secret');
    return runRecurring(null, null);
  }
  const s = await requireRole(...FINANCE);
  return runRecurring(s.orgId, s.uid);
});
