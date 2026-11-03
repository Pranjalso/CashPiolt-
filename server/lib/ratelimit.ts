/**
 * In-memory sliding window rate limiter for Next.js API / Edge runtime.
 * Protects login, registration, and sensitive endpoints against brute-force and DoS.
 */

type RecordEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RecordEntry>();

// Clean up expired buckets periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

/**
 * Check and record a hit for a key (e.g. IP + endpoint)
 * @param key Identifier (e.g. IP address, user email)
 * @param limit Max allowed requests in the window
 * @param windowMs Window duration in milliseconds (default: 60s)
 */
export function rateLimit(key: string, limit: number = 60, windowMs: number = 60_000): RateLimitResult {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.ceil(entry.resetAt / 1000),
    };
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  const success = entry.count <= limit;

  return {
    success,
    limit,
    remaining,
    reset: Math.ceil(entry.resetAt / 1000),
  };
}

/**
 * Helper to extract client IP from Next.js request headers
 */
export function getClientIp(req: Request): string {
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();
  return '127.0.0.1';
}

