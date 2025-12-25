const crypto = require('crypto');

// Store CSRF tokens in memory (use Redis in production)
const csrfTokens = new Map();

// Cleanup old tokens every hour
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of csrfTokens.entries()) {
    if (now - data.createdAt > 3600000) { // 1 hour
      csrfTokens.delete(token);
    }
  }
}, 3600000);

/**
 * Generate CSRF token
 */
const generateCsrfToken = (userId) => {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(token, {
    userId,
    createdAt: Date.now()
  });
  return token;
};

/**
 * Validate CSRF token
 */
const validateCsrfToken = (token, userId) => {
  if (!token) return false;

  const data = csrfTokens.get(token);
  if (!data) return false;

  // Check if token belongs to user
  if (data.userId !== userId) return false;

  // Check if token is not expired (1 hour)
  if (Date.now() - data.createdAt > 3600000) {
    csrfTokens.delete(token);
    return false;
  }

  return true;
};

/**
 * CSRF Protection Middleware
 */
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip for health check
  if (req.path === '/health') {
    return next();
  }

  // Get token from header or body
  const token = req.headers['x-csrf-token'] || req.body._csrf;

  // For authenticated requests, validate token
  if (req.user && req.user.id) {
    if (!validateCsrfToken(token, req.user.id)) {
      console.log(`[CSRF] Invalid token for user: ${req.user.id}`);
      return res.status(403).json({
        error: 'Invalid CSRF token',
        code: 'CSRF_INVALID'
      });
    }
  }

  next();
};

/**
 * Route to get CSRF token
 */
const getCsrfToken = (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = generateCsrfToken(req.user.id);
  res.json({ csrfToken: token });
};

module.exports = {
  csrfProtection,
  getCsrfToken,
  generateCsrfToken,
  validateCsrfToken
};