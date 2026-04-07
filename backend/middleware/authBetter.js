const auth = require('../config/auth');
const { getRedisClient } = require('../config/redis');

const SESSION_CACHE_TTL_MS = 60 * 1000; // 60 seconds
const SESSION_CACHE_TTL_S  = 60;        // same, in seconds (for Redis EX)

// ── In-memory fallback (used when Redis is not available) ────────────────────
const memCache = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memCache.entries()) {
    if (now - entry.timestamp >= SESSION_CACHE_TTL_MS) memCache.delete(key);
  }
}, 5 * 60 * 1000);

// ── Cache helpers (Redis with in-memory fallback) ────────────────────────────
const CACHE_PREFIX = 'sess:';

const cacheGet = async (token) => {
  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(CACHE_PREFIX + token);
      return raw ? JSON.parse(raw) : null;
    } catch { /* fall through to mem cache */ }
  }
  const entry = memCache.get(token);
  if (entry && Date.now() - entry.timestamp < SESSION_CACHE_TTL_MS) return entry;
  return null;
};

const cacheSet = async (token, data) => {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(CACHE_PREFIX + token, JSON.stringify(data), 'EX', SESSION_CACHE_TTL_S);
      return;
    } catch { /* fall through to mem cache */ }
  }
  memCache.set(token, { ...data, timestamp: Date.now() });
};

const cacheDel = async (token) => {
  const redis = getRedisClient();
  if (redis) {
    try { await redis.del(CACHE_PREFIX + token); } catch { /* ignore */ }
  }
  memCache.delete(token);
};

// Exported so logout route can invalidate immediately
const sessionCache = {
  delete: (token) => cacheDel(token),
};

// ── authMiddleware ────────────────────────────────────────────────────────────
const authMiddleware = async (req, res, next) => {
  try {
    // Accept token from Authorization header (Bearer) OR httpOnly session_token cookie
    const sessionToken = req.headers.authorization?.replace('Bearer ', '')
      || req.cookies?.session_token;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Token d\'authentification manquant' });
    }

    // Serve from cache if available
    const cached = await cacheGet(sessionToken);
    if (cached) {
      req.user = cached.user;
      req.session = cached.session;
      return next();
    }

    const result = await auth.api.getSession({
      headers: { authorization: `Bearer ${sessionToken}` }
    });

    if (!result || !result.user || !result.session) {
      await cacheDel(sessionToken);
      return res.status(401).json({ error: 'Session invalide' });
    }

    await cacheSet(sessionToken, { user: result.user, session: result.session });

    req.user = result.user;
    req.session = result.session;

    next();
  } catch (error) {
    console.error('Erreur middleware auth:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const adminMiddleware = async (req, res, next) => {
  try {
    await authMiddleware(req, res, () => {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Accès administrateur requis' });
      }
      next();
    });
  } catch (error) {
    console.error('Erreur middleware admin:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  sessionCache,
};
