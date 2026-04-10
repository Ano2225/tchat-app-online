const parseOrigins = (...values: Array<string | undefined>) => {
  const origins = new Set<string>()

  for (const value of values) {
    if (!value) continue

    for (const candidate of value.split(',')) {
      const normalizedCandidate = candidate.trim()
      if (!normalizedCandidate) continue

      try {
        origins.add(new URL(normalizedCandidate).origin)
      } catch {
        // Ignore invalid CSP origins from env
      }
    }
  }

  return Array.from(origins)
}

const toWebSocketOrigin = (origin: string) => {
  if (origin.startsWith('https://')) return `wss://${origin.slice('https://'.length)}`
  if (origin.startsWith('http://')) return `ws://${origin.slice('http://'.length)}`
  return origin
}

const analyticsOrigin = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
  ? process.env.NEXT_PUBLIC_UMAMI_URL || 'http://localhost:3001'
  : process.env.NEXT_PUBLIC_UMAMI_URL

const connectOrigins = parseOrigins(
  process.env.BACKEND_URL,
  process.env.NEXT_PUBLIC_SOCKET_URL,
  process.env.NEXT_PUBLIC_API_URL,
  analyticsOrigin,
)

const connectSrc = [
  "'self'",
  ...connectOrigins,
  ...connectOrigins.map(toWebSocketOrigin),
  'https://ice1.somafm.com',
]

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(process.env.NODE_ENV !== 'production' ? ["'unsafe-eval'"] : []),
  ...parseOrigins(analyticsOrigin),
]

/** @type {import('next').NextConfig} */
const nextConfig: import('next').NextConfig = {
  // Production optimizations
  output: 'standalone',

  // Strip console.* calls in production builds (keeps console.error)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error'] }
      : false,
  },

  // No source maps shipped to browser in production (reduces JS payload ~30%)
  productionBrowserSourceMaps: false,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/:path*`
      }
    ]
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src ${scriptSrc.join(' ')}`,
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self'",
              "img-src 'self' data: blob: https://res.cloudinary.com",
              `connect-src ${connectSrc.join(' ')}`,
              "media-src 'self' https://res.cloudinary.com https://ice1.somafm.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}

export default nextConfig
