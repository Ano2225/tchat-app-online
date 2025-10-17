const validator = require('validator');

// Validation des données utilisateur
const validateUserRegistration = (req, res, next) => {
  const { username, email, password } = req.body;
  const errors = [];

  // Validation username
  if (!username || username.length < 3 || username.length > 20) {
    errors.push('Le nom d\'utilisateur doit contenir entre 3 et 20 caractères');
  }
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    errors.push('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores');
  }

  // Validation email
  if (!email || !validator.isEmail(email)) {
    errors.push('Email invalide');
  }

  // Validation password
  if (!password || password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial');
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: errors.join(', ') });
  }

  next();
};

// Validation des messages
const validateMessage = (req, res, next) => {
  const { content } = req.body;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ message: 'Le contenu du message est requis' });
  }

  if (content.length > 1000) {
    return res.status(400).json({ message: 'Le message est trop long (max 1000 caractères)' });
  }

  // Sanitisation basique
  req.body.content = content.trim();

  next();
};

// Validation des IDs MongoDB
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }
    next();
  };
};

// Sanitisation des entrées
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = validator.escape(obj[key]);
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

module.exports = {
  validateUserRegistration,
  validateMessage,
  validateObjectId,
  sanitizeInput
};