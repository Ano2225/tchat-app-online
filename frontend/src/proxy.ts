import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Allowed country — Côte d'Ivoire ISO 3166-1 alpha-2
const ALLOWED_COUNTRY = 'CI'

export function proxy(request: NextRequest) {
  // Bypass geo-check in development (NEXT_PUBLIC_GEO_RESTRICT=true to force even in dev)
  const forceRestrict = process.env.NEXT_PUBLIC_GEO_RESTRICT === 'true'
  if (process.env.NODE_ENV !== 'production' && !forceRestrict) {
    return NextResponse.next()
  }

  // Don't restrict the restricted page itself (prevents redirect loop)
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/restricted')) {
    return NextResponse.next()
  }

  // Read country from Vercel edge header (auto-set) or Cloudflare/nginx proxy headers
  const country =
    request.headers.get('x-vercel-ip-country') ??
    request.headers.get('cf-ipcountry') ??
    request.headers.get('x-country-code') ??
    null

  // If no country header (e.g. localhost tunnels, missing proxy config), allow through
  // to avoid false positives — tighten this in production if needed
  if (!country) {
    return NextResponse.next()
  }

  if (country.toUpperCase() !== ALLOWED_COUNTRY) {
    const url = request.nextUrl.clone()
    url.pathname = '/restricted'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (Next.js static assets)
     * - _next/image   (Next.js image optimization)
     * - favicon / icon
     * - api routes (backend handles its own CORS)
     */
    '/((?!_next/static|_next/image|favicon|icon\\.svg|api/).*)',
  ],
}
