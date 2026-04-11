import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_COUNTRY = 'CI'
const GEO_COOKIE = 'geo_ok'
const GEO_COOKIE_TTL = 60 * 60 * 24 // 24h

function isPrivateIP(ip: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip === '::ffff:127.0.0.1'
  )
}

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

async function resolveCountry(ip: string): Promise<string | null> {
  // ip-api.com — pas de quota mensuel, 45 req/min
  // L'appel est server-side donc HTTP est acceptable
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
      signal: AbortSignal.timeout(2500),
    })
    if (res.ok) {
      const data = await res.json() as { countryCode?: string }
      if (data.countryCode && /^[A-Z]{2}$/.test(data.countryCode)) return data.countryCode
    }
  } catch {
    // API injoignable → fail open
  }
  return null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ne jamais intercepter la page de blocage (évite la boucle de redirections)
  if (pathname === '/not-available') return NextResponse.next()

  // Rediriger les sessions actives depuis la landing page vers /chat
  if (pathname === '/' && request.cookies.get('session_token')?.value) {
    return NextResponse.redirect(new URL('/chat', request.url))
  }

  // En dev local, pas de restriction géographique
  if (process.env.NODE_ENV !== 'production') return NextResponse.next()

  // Cookie déjà validé → accès sans appel API
  if (request.cookies.get(GEO_COOKIE)?.value === ALLOWED_COUNTRY) {
    return NextResponse.next()
  }

  const ip = getIP(request)

  // IP privée (Docker, localhost) → toujours autorisée
  if (isPrivateIP(ip)) return NextResponse.next()

  const country = await resolveCountry(ip)

  // API injoignable → fail open (ne pas bloquer par erreur)
  if (!country) return NextResponse.next()

  if (country !== ALLOWED_COUNTRY) {
    return NextResponse.redirect(new URL('/not-available', request.url))
  }

  // Accès accordé → cookie 24h pour éviter un nouvel appel API
  const res = NextResponse.next()
  res.cookies.set(GEO_COOKIE, ALLOWED_COUNTRY, {
    maxAge: GEO_COOKIE_TTL,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|icon\\.svg|api/).*)',
  ],
}
