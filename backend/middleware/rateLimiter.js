const rateLimit = require('express-rate-limit');

// Rate limiter pour les routes d'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives par IP
  message: {
    error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter pour les messages
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 messages par minute
  message: {
    error: 'Trop de messages envoyés. Ralentissez un peu.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter pour les uploads
const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 uploads par 5 minutes
  message: {
    error: 'Trop d\'uploads. Réessayez dans quelques minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter général
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requêtes par IP
  message: {
    error: 'Trop de requêtes. Réessayez plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  messageLimiter,
  uploadLimiter,
  generalLimiter
};