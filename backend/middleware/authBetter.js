const auth = require('../config/auth');

const authMiddleware = async (req, res, next) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'Token d\'authentification manquant' });
    }

    const result = await auth.api.getSession({
      headers: { authorization: `Bearer ${sessionToken}` }
    });

    if (!result || !result.user || !result.session) {
      return res.status(401).json({ error: 'Session invalide' });
    }

    // Ajouter l'utilisateur à la requête
    req.user = result.user;
    req.session = result.session;
    
    next();
  } catch (error) {
    console.error('Erreur middleware auth:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const adminMiddleware = async (req, res, next) => {
  try {
    await authMiddleware(req, res, () => {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Accès administrateur requis' });
      }
      next();
    });
  } catch (error) {
    console.error('Erreur middleware admin:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = {
  authMiddleware,
  adminMiddleware
};
