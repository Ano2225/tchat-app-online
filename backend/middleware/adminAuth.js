const User = require('../models/User');
const jwt = require('jsonwebtoken');

const adminAuth = async (req, res, next) => {
  try {
    // Vérifier le token
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Token manquant - Accès refusé' });
    }

    // Vérifier la validité du token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier l'utilisateur en base
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé - Droits administrateur requis' });
    }
    
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Compte bloqué' });
    }
    
    req.user = decoded;
    req.adminUser = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token invalide' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré' });
    }
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = adminAuth;