const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const validator = require('validator');

// Configuration CORS sécurisée
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')
      .map(o => o.trim())
      .concat(['http://localhost:3000'])
      .filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-csrf-token']
};

// Rate limiting global
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requêtes par IP par fenêtre
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

// Rate limiting pour l'envoi de messages (POST uniquement)
const messageRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 messages envoyés par minute
  message: {
    error: 'Trop de messages envoyés, ralentissez un peu.'
  },
  skip: (req) => req.method !== 'POST',
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

// Fields that must stay raw (passwords, tokens) — never modify them
const SKIP_SANITIZE = new Set(['password', 'token', 'refreshToken', 'accessToken', 'newPassword', 'currentPassword']);

// Sanitize a single string:
//  - Strip NUL bytes (DB truncation risk)
//  - Remove <script> tags, javascript: URIs, inline event handlers (XSS patterns)
//  - Do NOT entity-escape — React auto-escapes on render; server-side escaping causes
//    double-encoding ("C'est" → "C&#x27;est" visible in UI)
const sanitizeString = (key, value) => {
  if (SKIP_SANITIZE.has(key)) return value.replace(/\0/g, '').trim();
  return value
    .replace(/\0/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

// Strip MongoDB operator injection keys ($where, $gt, $ne, etc.)
const stripMongoOperators = (obj) => {
  if (Array.isArray(obj)) return obj.map(stripMongoOperators);
  if (obj !== null && typeof obj === 'object') {
    const clean = {};
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$')) continue;
      clean[key] = stripMongoOperators(obj[key]);
    }
    return clean;
  }
  return obj;
};

const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(key, obj[key]);
      } else if (Array.isArray(obj[key])) {
        obj[key] = obj[key].map(item =>
          typeof item === 'string' ? sanitizeString(key, item) : sanitize(item)
        );
      } else if (obj[key] !== null && typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
    return obj;
  };

  if (req.body)   req.body   = sanitize(stripMongoOperators(req.body));
  if (req.query)  req.query  = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

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

// Track failed login attempts per IP
const loginAttempts = new Map();

const checkBruteForce = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  const ip = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 10;

  const record = loginAttempts.get(ip) || { count: 0, firstAttempt: now };

  if (now - record.firstAttempt > windowMs) {
    // Reset window
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }

  if (record.count >= maxAttempts) {
    return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
  }

  record.count += 1;
  loginAttempts.set(ip, record);
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