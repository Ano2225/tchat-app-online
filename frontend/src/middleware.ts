import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_COUNTRY = 'CI';
const GEO_COOKIE = 'geo_ok';
const GEO_COOKIE_TTL = 60 * 60 * 24; // 24h

// IPs privées / loopback → toujours autorisées (dev local)
function isPrivateIP(ip: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip === '::ffff:127.0.0.1'
  );
}

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

async function resolveCountry(ip: string): Promise<string | null> {
  // ip-api.com — pas de quota mensuel, 45 req/min (suffisant avec cookie 24h)
  // L'appel est server-side donc HTTP est acceptable
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const data = await res.json() as { countryCode?: string };
      if (data.countryCode && /^[A-Z]{2}$/.test(data.countryCode)) return data.countryCode;
    }
  } catch {
    // API injoignable → fail open (ne pas bloquer)
  }

  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ne pas intercepter les assets, les routes internes Next.js, et la page de blocage
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname === '/not-available' ||
    pathname.match(/\.(ico|svg|png|jpg|jpeg|webp|woff2?|css|js|map|txt|xml)$/)
  ) {
    return NextResponse.next();
  }

  // Cookie déjà présent → accès autorisé sans appel API
  if (req.cookies.get(GEO_COOKIE)?.value === ALLOWED_COUNTRY) {
    return NextResponse.next();
  }

  const ip = getIP(req);

  // Dev local → toujours autorisé
  if (isPrivateIP(ip)) {
    return NextResponse.next();
  }

  const country = await resolveCountry(ip);

  // Inconnu (API injoignable) → fail open
  if (!country) return NextResponse.next();

  if (country !== ALLOWED_COUNTRY) {
    return NextResponse.redirect(new URL('/not-available', req.url));
  }

  // Accès accordé → poser le cookie 24h pour éviter un nouvel appel API
  const res = NextResponse.next();
  res.cookies.set(GEO_COOKIE, ALLOWED_COUNTRY, {
    maxAge: GEO_COOKIE_TTL,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  return res;
}

export const config = {
  matcher: [
    /*
     * Intercepte toutes les routes sauf :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation d'images)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
