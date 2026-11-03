import { NextRequest, NextResponse } from 'next/server';
import { COOKIE, tokenFrom, verifySession } from '@/lib/session';
import { rateLimit, getClientIp } from '@/lib/ratelimit';

const PUBLIC = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/recurring/run'];

function applySecurityHeaders(res: NextResponse): NextResponse {
  // Prevent clickjacking
  res.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME-type sniffing
  res.headers.set('X-Content-Type-Options', 'nosniff');

  // Strict Referrer Policy
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict browser features
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  // Content Security Policy
  const isDev = process.env.NODE_ENV !== 'production';
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  res.headers.set('Content-Security-Policy', csp);

  // Strict-Transport-Security in production
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  return res;
}

function cors(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get('origin');
  const allowed = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (origin && (allowed.includes(origin) || process.env.NODE_ENV !== 'production')) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Vary', 'Origin');
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);

  // Pre-flight CORS
  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    return cors(req, applySecurityHeaders(new NextResponse(null, { status: 204 })));
  }

  // Rate Limiting for Auth APIs (Brute-Force Protection)
  if (pathname === '/api/auth/login' || pathname === '/api/auth/register') {
    const rl = rateLimit(`auth:${ip}`, 20, 60_000); // Max 20 attempts per minute per IP
    if (!rl.success) {
      const resp = NextResponse.json(
        { error: 'Too many authentication attempts. Please try again in 1 minute.' },
        { status: 429 }
      );
      resp.headers.set('Retry-After', '60');
      return cors(req, applySecurityHeaders(resp));
    }
  }

  // General API Rate Limiting (DDoS Protection)
  if (pathname.startsWith('/api/')) {
    const rl = rateLimit(`api:${ip}`, 200, 60_000); // 200 requests per minute
    if (!rl.success) {
      const resp = NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down.' },
        { status: 429 }
      );
      resp.headers.set('Retry-After', '60');
      return cors(req, applySecurityHeaders(resp));
    }
  }

  // Allow public routes
  if (PUBLIC.some(p => pathname.startsWith(p))) {
    return cors(req, applySecurityHeaders(NextResponse.next()));
  }

  // Verify JWT session
  const token = tokenFrom(req.headers.get('authorization'), req.cookies.get(COOKIE)?.value);
  const s = await verifySession(token);

  if (!s) {
    if (pathname.startsWith('/api/')) {
      return cors(
        req,
        applySecurityHeaders(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      );
    }
    const redirectUrl = new URL('/login', req.url);
    // If requesting protected page, preserve origin or redirect cleanly
    return applySecurityHeaders(NextResponse.redirect(redirectUrl));
  }

  return cors(req, applySecurityHeaders(NextResponse.next()));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
