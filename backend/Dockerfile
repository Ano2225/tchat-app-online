# Production — multi-stage, non-root, minimal image
# Build context must be the project ROOT (package.json lives there)
# docker-compose.yml: context: ../ dockerfile: backend/Dockerfile

FROM node:20-alpine AS deps
WORKDIR /app
# package.json is at project root
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache dumb-init

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY --from=deps /app/node_modules ./node_modules

# Copy only the backend source, not frontend/ or infra/
COPY --chown=nodejs:nodejs backend/ ./backend/

RUN mkdir -p logs && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/server.js"]
