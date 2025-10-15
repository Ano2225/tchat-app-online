const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Aucun token, autorisation refusée' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier si l'utilisateur existe et n'est pas bloqué
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }
    
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Votre compte a été bloqué. Contactez l\'administrateur.' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalide' });
  }
};

module.exports = authMiddleware;