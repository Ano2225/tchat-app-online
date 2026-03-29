const crypto = require('crypto');

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.BETTER_AUTH_SECRET;
if (!CSRF_SECRET) {
  console.error('❌ CSRF_SECRET (or BETTER_AUTH_SECRET) must be set. Refusing to start without it.');
  process.exit(1);
}
const TOKEN_TTL_MS = 3600000; // 1 hour

/**
 * Generate a stateless HMAC-signed CSRF token.
 * Format: <timestamp>.<hmac>
 * No server-side storage needed — works across restarts and multiple instances.
 */
const generateCsrfToken = (userId) => {
  const timestamp = Date.now().toString();
  const payload = `${userId}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');
  return `${timestamp}.${hmac}`;
};

/**
 * Validate a CSRF token for the given userId.
 */
const validateCsrfToken = (token, userId) => {
  if (!token || typeof token !== 'string') return false;

  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return false;

  const timestamp = token.slice(0, dotIndex);
  const provided = token.slice(dotIndex + 1);

  // Check expiry
  if (Date.now() - parseInt(timestamp, 10) > TOKEN_TTL_MS) return false;

  // Constant-time comparison
  const payload = `${userId}:${timestamp}`;
  const expected = crypto.createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
};

/**
 * CSRF Protection Middleware
 */
const csrfProtection = (req, res, next) => {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (req.path === '/health') {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body?._csrf;

  if (req.user && (req.user.id || req.user._id)) {
    const userId = String(req.user.id || req.user._id);
    let valid = false;
    try {
      valid = validateCsrfToken(token, userId);
    } catch {
      valid = false;
    }
    if (!valid) {
      return res.status(403).json({ error: 'Invalid CSRF token', code: 'CSRF_INVALID' });
    }
  }

  next();
};

/**
 * Route to get CSRF token
 */
const getCsrfToken = (req, res) => {
  if (!req.user || (!req.user.id && !req.user._id)) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = String(req.user.id || req.user._id);
  const token = generateCsrfToken(userId);
  res.json({ csrfToken: token });
};

module.exports = {
  csrfProtection,
  getCsrfToken,
  generateCsrfToken,
  validateCsrfToken
};
