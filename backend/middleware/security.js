const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// Configuration CORS sécurisée
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'https://your-domain.com' // Remplacer par votre domaine en production
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Rate limiting global
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // limite de 2000 requêtes par IP
  message: {
    error: 'Trop de requêtes depuis cette IP, réessayez plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting pour l'authentification
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives de connexion par IP
  message: {
    error: 'Trop de tentatives de connexion, réessayez dans 15 minutes.'
  },
  skipSuccessfulRequests: true,
});

// Rate limiting pour les messages
const messageRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requêtes par minute
  message: {
    error: 'Trop de messages envoyés, ralentissez un peu.'
  },
});

// Configuration Helmet pour la sécurité
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Middleware de validation des entrées
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Supprimer les caractères dangereux
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  
  next();
};

// Middleware de logging sécurisé
const secureLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    // Ne pas logger les données sensibles
    if (req.user) {
      logData.userId = req.user.id;
      logData.userRole = req.user.role;
    }
    
    console.log(JSON.stringify(logData));
  });
  
  next();
};

// Middleware de protection contre les attaques par force brute (DÉSACTIVÉ)
const checkBruteForce = (req, res, next) => {
  // Protection désactivée pour le développement
  next();
};

module.exports = {
  corsOptions,
  globalRateLimit,
  authRateLimit,
  messageRateLimit,
  helmetConfig,
  sanitizeInput,
  secureLogger,
  checkBruteForce
};