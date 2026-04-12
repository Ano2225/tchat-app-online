const rateLimit = require('express-rate-limit');

// Rate limiter pour les routes d'authentification
const isDev = process.env.NODE_ENV === 'development';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Trop de tentatives de connexion, réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
  handler: (req, res) => {
    res.status(429).json({ error: 'Trop de tentatives de connexion, réessayez dans 15 minutes.' });
  }
});

const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'Trop de messages envoyés. Ralentissez un peu.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
});

const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
  message: { error: "Trop d'uploads. Réessayez dans quelques minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Trop de requêtes. Réessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
});

module.exports = {
  authLimiter,
  messageLimiter,
  uploadLimiter,
  generalLimiter
};