# CLAUDE.md — BabiChat Online

## Project Overview

**BabiChat Online** is a full-stack real-time chat application. The name in `package.json` is `babichat-app-online`.

- **Backend**: Node.js / Express / Socket.IO — runs on port `8000`
- **Frontend**: Next.js 15 / React 19 / TypeScript / Tailwind CSS — runs on port `3000`
- **Database**: MongoDB via Mongoose 8
- **Auth**: `better-auth` library — email/password + anonymous sessions; email verification **disabled** for MVP
- **Real-time**: Socket.IO for chat, presence, reactions, private messages
- **File uploads**: Cloudinary (via Multer)
- **AI**: Groq only (`llama-3.1-8b-instant`) via `GROQ_API_KEY` — **UI hidden for MVP**, backend routes still exist
- **Email**: SMTP / Mailhog (dev)
- **Analytics**: Umami (self-hosted) — runs on port `3001` via Docker
- **Infrastructure**: Docker Compose in `infra/` — MongoDB, Redis, Mailhog, backend, Umami

---

## Repository Layout

```
/
├── backend/          # Express API + Socket.IO server
├── frontend/         # Next.js application
├── infra/            # Docker Compose (all services)
├── docs/             # Project documentation
├── package.json      # Root — backend scripts + dependencies
└── .env.example      # Environment variable template
```

The **backend has no separate package.json** — all backend dependencies live in the root `package.json`. Frontend has its own `frontend/package.json`.

---

## Development Setup

### Prerequisites
- Node.js 20+
- Docker (for infrastructure)

### Start infrastructure
```bash
cd infra && docker compose up -d
```
Starts: MongoDB `:27017`, Redis `:6379`, Mailhog SMTP `:1025` / UI `:8025`, Umami `:3001`, backend `:8000`.

### Environment
```bash
cp .env.example .env
# Required: MONGODB_URI, BETTER_AUTH_SECRET, JWT_SECRET, FRONTEND_URL
# For AI: GROQ_API_KEY
# For uploads: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
# For analytics: UMAMI_APP_SECRET, UMAMI_DB_PASSWORD
```

### Run backend (dev, outside Docker)
```bash
npm run dev          # nodemon backend/server.js
```

### Run frontend
```bash
cd frontend && npm install && npm run dev
```

### Initialize database
```bash
npm run init-channels   # seed default channels (General, Music, Sport)
npm run init-admin      # create admin user from ADMIN_* env vars
```

### Umami analytics setup (first time only)
1. Open http://localhost:3001 — login: `admin` / `umami`
2. Settings → Profile → change password
3. Settings → Websites → Add website → copy the **Website ID**
4. Add to frontend `.env.local`:
   ```
   NEXT_PUBLIC_UMAMI_URL=http://localhost:3001
   NEXT_PUBLIC_UMAMI_WEBSITE_ID=<your-website-id>
   ```

---

## Key Commands

| Command | Description |
|---|---|
| `npm run dev` | Start backend with nodemon |
| `npm start` | Start backend (production) |
| `npm run init-channels` | Seed default channels |
| `npm run init-admin` | Create admin user (uses `ADMIN_*` env vars) |
| `cd frontend && npm run dev` | Start Next.js dev server |
| `cd frontend && npm run build` | Production build |
| `cd frontend && npm run lint` | ESLint check |
| `cd infra && docker compose up -d` | Start all infrastructure |
| `cd infra && docker compose down` | Stop all infrastructure |

---

## Backend Architecture

### Entry Point
`backend/server.js` — Express + Socket.IO server with class-based setup. Loads middleware, registers routes, connects MongoDB, initialises Socket.IO.

Socket.IO config: `perMessageDeflate` (threshold 512B), `pingTimeout: 20s`, `pingInterval: 25s`, `maxHttpBufferSize: 1MB`, transports `['websocket', 'polling']`.

### Routes
| File | Prefix | Description |
|---|---|---|
| `backend/routes/authBetter.js` | `/api/auth` | Register, login, logout, anonymous auth, change password |
| `backend/routes/message.js` | `/api/messages` | Channel messages (paginated), private messages, reactions |
| `backend/routes/channel.js` | `/api/channels` | Channel CRUD |
| `backend/routes/user.js` | `/api/user` | Profile, avatar, user lookup |
| `backend/routes/upload.js` | `/api/upload` | Image/video upload to Cloudinary |
| `backend/routes/admin.js` | `/api/admin` | Admin panel — users, channels, reports, alerts, analytics |
| `backend/routes/reports.js` | `/api/reports` | Report/block users |
| `backend/routes/aiAgents.js` | `/api/ai-agents` | AI agent list and chat (Groq) |

### Middleware Stack (in order)
1. `helmet` — security headers
2. `cors` — origin whitelist from `FRONTEND_URL` env var (comma-separated for multiple origins)
3. `express.json({ limit: '1mb' })` — body parsing
4. `securitySanitize` — XSS / injection sanitization
5. `globalRateLimit` — 200 req / 15 min
6. Route-specific limiters: `authRateLimit`, `messageRateLimit` (20 msg/min)

### Session cache (M9 fix)
`backend/middleware/authBetter.js` caches `auth.api.getSession()` results for **60 seconds** in a `Map`. Eviction runs every 5 minutes. This avoids one DB round-trip per request.

### Socket.IO
- `backend/socket/socketHandlers.js` — all chat events
- Zero DB queries for user list: `socket.userMeta` (set at `user_connected`) is reused in all broadcasts
- Debounced user list broadcasts: 250ms per room + global
- Message history: `.sort({ createdAt: -1 }).limit(50).lean().reverse()`
- Game handlers exist but are **disabled** (`gameHandlers.js` not imported)
- CORS uses `FRONTEND_URL` env var, never hardcoded
- **Never trust client-supplied user IDs in socket events** — always use `socket.userId`

### Auth pattern
- Protected routes: `authMiddleware` → `req.user` (from better-auth session)
- Admin routes: `adminMiddleware` → checks `req.user.role === 'admin'`
- Always use `req.user.id` (better-auth string ID) — never `req.body.sender` or `req.body.userId`

### better-auth ID compatibility — CRITICAL
better-auth stores user `_id` in MongoDB as a **32-char hex string** (not ObjectId). All Mongoose models that reference User must declare those fields as `type: String`, not `mongoose.Schema.Types.ObjectId`. This applies to:
- `User._id` — `{ type: String }` with `_id: false` in schema options
- `User.blockedUsers` — `[{ type: String }]`
- `Message.sender`, `Message.recipient` — `String`
- `Report.reportedBy`, `Report.reportedUser` — `String`
- `Alert.relatedUserId` — `String`
- `AIUsage.userId` — `String`
- `RefreshToken.userId` — `String`

**Never use `new mongoose.Types.ObjectId(userId)` with user IDs** — it will throw CastError in Mongoose 8 for 32-char string IDs.

For backward compatibility (legacy data with ObjectId `_id`), `userController.getUserById` uses `User.collection.findOne({ $or: [{ _id: id }, { _id: new ObjectId(id) }] })`.

### AI Service (MVP — UI hidden)
`backend/services/aiService.js` uses **Groq only** (`llama-3.1-8b-instant`). All other providers (Ollama, HuggingFace, Vertex AI) have been removed. Falls back to preset responses if `GROQ_API_KEY` is not set. UI is hidden in the frontend but routes remain.

### Admin Analytics
`GET /api/admin/analytics` returns a pre-computed `timeline` array (7 days) with `activeUsers`, `newUsers`, `messages` per day, plus `hourlyStats` for the last 24h. All aggregations run in parallel via `Promise.all`.

---

## Frontend Architecture

### Routing (App Router)
```
app/
├── (auth)/           # Public: login, register, anonymous, forgot/reset password
├── (main)/           # Public main pages
└── (protected)/      # Requires auth: /chat, /admin/dashboard
```

### State Management (Zustand)
- `frontend/src/store/authStore.ts` — user session, token, login/logout
  - Reads token from store (not localStorage directly) — fixed H1
  - Cross-tab logout sync via `window.addEventListener('storage', ...)` — fixed M7

### API Communication
- `frontend/src/utils/axiosInstance.ts` — Axios with auth header from Zustand store
  - `baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'` — direct to backend
- `frontend/src/utils/axiosInterceptor.ts` — token refresh on 401
- `frontend/src/services/` — service modules (auth, chat, admin, reports)

### Next.js Config
`frontend/next.config.ts`:
- `/api/*` requests proxied to `BACKEND_URL` (for `fetch()` calls)
- **Note**: `axiosInstance` calls go **directly** to `:8000`, not through the proxy
- Images from `res.cloudinary.com` allowed
- Security headers (HSTS, X-Frame-Options, etc.)

### Umami tracking
`frontend/src/app/layout.tsx` injects the Umami `<Script>` only when `NEXT_PUBLIC_UMAMI_WEBSITE_ID` is set. No tracking in dev without this variable.

### Chat page features (MVP scope)
- Channel list (left sidebar) — collapsible on mobile
- Chat messages with pagination (50 messages + "Load more")
- Reply-to-message
- Emoji picker (lazy loaded via `next/dynamic`)
- Users online (right sidebar) — socket-driven, zero DB queries
- **Game panel**: disabled — commented out
- **AI chat box**: disabled — import and state removed

### Admin dashboard
Tabs: Overview · Analytics · Users · Channels · Reports

Analytics tab uses **Recharts** (installed as `recharts`):
- Bar chart: messages + active users per day (7 days)
- Line chart: new registrations per day (7 days)
- Bar chart: connections by hour (24h)
- KPI cards: peak hour, peak day, totals

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `BETTER_AUTH_SECRET` | Yes | Secret for better-auth token signing |
| `JWT_SECRET` | Yes | JWT signing key |
| `FRONTEND_URL` | Yes | Allowed CORS origin(s), comma-separated |
| `BACKEND_URL` | Frontend | Used by Next.js proxy rewrites |
| `NEXT_PUBLIC_SOCKET_URL` | Frontend | Socket.IO server URL (default: `http://localhost:8000`) |
| `NEXT_PUBLIC_API_URL` | Frontend | Axios base URL (default: `http://localhost:8000/api`) |
| `CLOUDINARY_CLOUD_NAME` | For uploads | Cloudinary credentials |
| `GROQ_API_KEY` | For AI | Groq API key (llama-3.1-8b-instant) |
| `CSRF_SECRET` | Recommended | CSRF HMAC secret (falls back to `BETTER_AUTH_SECRET`) |
| `REDIS_PASSWORD` | Docker | Redis auth password |
| `UMAMI_APP_SECRET` | Analytics | Umami app secret |
| `UMAMI_DB_PASSWORD` | Analytics | PostgreSQL password for Umami |
| `NEXT_PUBLIC_UMAMI_URL` | Analytics | Umami script host (default: `http://localhost:3001`) |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | Analytics | Umami website ID (tracking disabled if not set) |
| `ADMIN_USERNAME` | Init script | Admin username for `npm run init-admin` |
| `ADMIN_PASSWORD` | Init script | Admin password for `npm run init-admin` |
| `ADMIN_EMAIL` | Init script | Admin email for `npm run init-admin` |

The server exits on startup if `MONGODB_URI` is missing.

---

## Security Notes

Applied:
- **User impersonation**: `sender` taken from `req.user.id` / `socket.userId`, never from client input
- **NoSQL injection**: Admin search escapes regex chars before `$regex`
- **File upload**: Magic bytes + extension validation (not just client MIME)
- **CSRF**: Stateless HMAC-signed tokens, 1h TTL, `crypto.timingSafeEqual`
- **Brute force**: In-memory login attempt tracking (skipped in `NODE_ENV=development`)
- **Rate limits**: Global 200 req/15min, messages 20/min
- **CORS**: Dynamic from `FRONTEND_URL`, never hardcoded
- **Avatar URLs**: Validated with `/^https?:\/\//` before rendering
- **Error boundaries**: Chat components wrapped in `<ErrorBoundary>`
- **Stack traces**: Only shown in `NODE_ENV=development`
- **Session cache**: `auth.api.getSession()` cached 60s to reduce DB load

Still open:
- **H1** — Auth tokens in `localStorage` (XSS risk); full fix = httpOnly cookies
- **M11** — Docker Compose backend healthcheck could be more robust
- **M12** — Accessibility: focus management in modals incomplete
- **L1** — Message list not virtualized (slow with 1000+ messages)
- **L3** — Several `any` types remain in frontend TypeScript

---

## Database Models

| Model | File | Key Fields |
|---|---|---|
| User | `backend/models/User.js` | `_id: String` (32-char, better-auth), email, username, role, isAnonymous, avatarUrl, blockedUsers |
| Message | `backend/models/Message.js` | content, `sender: String` (ref User), room, `recipient: String` (ref User), reactions, replyTo |
| Channel | `backend/models/Channel.js` | name, description, isPrivate |
| AIAgent | `backend/models/AIAgent.js` | name, character, systemPrompt |
| AIUsage | `backend/models/AIUsage.js` | `userId: String`, dateKey, count |
| Report | `backend/models/Report.js` | `reportedBy: String`, `reportedUser: String`, reason, status |
| Alert | `backend/models/Alert.js` | type, title, message, severity, `relatedUserId: String` |
| RefreshToken | `backend/models/RefreshToken.js` | token, `userId: String`, expiresAt, family |
| Game | `backend/models/Game.js` | channel, players, scores — **disabled for MVP** |

Message indexes: `{ room, createdAt }`, `{ sender, recipient, createdAt }`, `{ recipient, read }`.

---

## MVP Standby (disabled features)

These features exist in the codebase but are intentionally disabled:

| Feature | Status | How to re-enable |
|---|---|---|
| **Game / Quiz** | Off | Uncomment `gameHandlers` import in `socketHandlers.js` + `GamePanel` in `chat/page.tsx` |
| **Email verification** | Off | Set `requireEmailVerification: true` in `backend/config/auth.js` + configure SMTP |
| **AI chat UI** | Off | Restore `AIAgentChatBox` import + `selectedAgent` state in `chat/page.tsx`; restore AI section in `UsersOnline.tsx` |

---

## Testing

No automated test suite. Manual checklist after changes:

- Send a message → verify it persists in MongoDB with `sender` matching the logged-in user's ID
- Open two tabs → logout in one → verify the other tab also logs out (cross-tab sync)
- Test admin search with special chars: `(`, `*`, `.`
- Test file upload with a renamed `.exe` (should be rejected)
- Test login rate limiting (brute force protection)
- Verify Socket.IO connects from `FRONTEND_URL` origin
- Open `/admin/dashboard` → verify Analytics tab loads charts
- Check Umami at `http://localhost:3001` → verify visits are tracked
