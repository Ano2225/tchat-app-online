const rateLimit = require('express-rate-limit');

// Rate limiting spécifique pour les APIs admin
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite à 100 requêtes par fenêtre par IP
  message: {
    error: 'Trop de requêtes admin depuis cette IP, réessayez dans 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Exclure les admins authentifiés du rate limiting strict
  skip: (req) => {
    return req.adminUser && req.adminUser.role === 'admin';
  }
});

module.exports = adminRateLimit;