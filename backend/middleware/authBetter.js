const auth = require('../config/auth');

// M9: In-memory session cache — avoids calling auth.api.getSession on every request
const SESSION_CACHE_TTL_MS = 60 * 1000; // 60 seconds
const sessionCache = new Map();

// Evict expired entries every 5 minutes to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of sessionCache.entries()) {
    if (now - entry.timestamp >= SESSION_CACHE_TTL_MS) {
      sessionCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

const authMiddleware = async (req, res, next) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');

    if (!sessionToken) {
      return res.status(401).json({ error: 'Token d\'authentification manquant' });
    }

    // Serve from cache if fresh
    const now = Date.now();
    const cached = sessionCache.get(sessionToken);
    if (cached && now - cached.timestamp < SESSION_CACHE_TTL_MS) {
      req.user = cached.user;
      req.session = cached.session;
      return next();
    }

    const result = await auth.api.getSession({
      headers: { authorization: `Bearer ${sessionToken}` }
    });

    if (!result || !result.user || !result.session) {
      sessionCache.delete(sessionToken);
      return res.status(401).json({ error: 'Session invalide' });
    }

    sessionCache.set(sessionToken, { user: result.user, session: result.session, timestamp: now });

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
  adminMiddleware
};
