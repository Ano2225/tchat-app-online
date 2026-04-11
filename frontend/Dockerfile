# Production — multi-stage, non-root, standalone Next.js
# Build context: frontend/
# docker-compose.prod.yml: context: frontend dockerfile: Dockerfile

# ── Stage 1: Install deps ─────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force

# ── Stage 2: Build ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* vars must be available at build time (baked into the bundle)
# Default to production domain — override via --build-arg if needed
ARG NEXT_PUBLIC_SOCKET_URL=https://babichat.tech
ARG NEXT_PUBLIC_API_URL=https://babichat.tech/api
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure public/ always exists — git doesn't track empty dirs so it may be absent in CI
RUN mkdir -p /app/public
RUN npm run build

# ── Stage 3: Runner ───────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]
