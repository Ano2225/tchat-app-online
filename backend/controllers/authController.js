const User = require('../models/User');
const Alert = require('../models/Alert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const INACTIVITY_TIMEOUT = 1000 * 60 * 1; 

class AuthController {

  // Inscription
  async register(req, res) {
    try {
      const { username, email, password, age, sexe, ville } = req.body;

      // Vérifier si l'utilisateur existe déjà
      let user = await User.findOne({ $or: [{ email }, { username }] });
      if (user) {
        return res.status(400).json({ message: 'Utilisateur déjà existant' });
      }

      const ageNum = parseInt(age);
      if (ageNum < 13 || ageNum > 25) {
        return res.status(400).json({ message: 'L\'âge doit être entre 13 et 25 ans' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Créer un nouvel utilisateur
      user = new User({
        username,
        email,
        password: hashedPassword,
        isAnonymous: false,
        age: ageNum,
        sexe,
        ville: ville || null,
      });

      await user.save();
      
      // Créer une alerte pour le nouvel utilisateur
      await Alert.create({
        type: 'new_user',
        title: 'Nouvel utilisateur inscrit',
        message: `${username} s'est inscrit sur la plateforme`,
        severity: 'low',
        relatedUserId: user._id
      });

      // Générer un token JWT
      const token = jwt.sign(
        { id: user._id, username: user.username }, 
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(201).json({ token, user: { id: user._id, username: user.username } });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Connexion
  async login(req, res) {
    try {
      const { username, password } = req.body;

      // Vérifier si l'utilisateur existe (par username ou email)
      const user = await User.findOne({
        $or: [{ username }, { email: username }],
        isAnonymous: false
      });
      if (!user) {
        return res.status(400).json({ message: 'Identifiants invalides' });
      }

      // Vérifier si l'utilisateur est bloqué
      if (user.isBlocked) {
        return res.status(403).json({ message: 'Votre compte a été bloqué. Contactez l\'administrateur.' });
      }

      // Vérifier le mot de passe
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Identifiants invalides' });
      }

      //Mettre à jour la date de dernier accès 
      user.lastSeen = new Date();
      user.isOnline = true;
      user.isEnabled = true;
      await user.save();

      // Générer un token JWT
      const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role }, 
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({ 
        token, 
        user: { 
          id: user._id, 
          username: user.username,
          role: user.role
        } 
      });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Connexion anonyme
  async anonymousLogin(req, res) {
    try {
      const { username, age, sexe } = req.body;

      if (!username) {
        return res.status(400).json({ message: 'Le nom d\'utilisateur est requis' });
      }

      if (!age) {
        return res.status(400).json({ message: 'L\'âge est requis' });
      }

      // Validation du nom d'utilisateur
      if (username.length < 3) {
        return res.status(400).json({ message: 'Le nom d\'utilisateur doit contenir au moins 3 caractères' });
      }

      if (username.length > 20) {
        return res.status(400).json({ message: 'Le nom d\'utilisateur ne peut pas dépasser 20 caractères' });
      }

      const ageNum = parseInt(age);
      if (ageNum < 13 || ageNum > 25) {
        return res.status(400).json({ message: 'L\'âge doit être entre 13 et 25 ans' });
      }

      // Vérifier si un utilisateur authentifié utilise déjà ce nom d'utilisateur
      const existingUser = await User.findOne({ username, isAnonymous: false });
      if (existingUser) {
        return res.status(400).json({ message: 'Ce nom d\'utilisateur est déjà réservé par un utilisateur authentifié' });
      }

      // Vérifier si un utilisateur anonyme avec ce nom est actuellement en ligne
      const existingAnonymousUserOnline = await User.findOne({ username, isAnonymous: true, isOnline: true });
      if (existingAnonymousUserOnline) {
        return res.status(400).json({ message: 'Ce nom d\'utilisateur est actuellement utilisé par un utilisateur anonyme en ligne' });
      }

      // OK, on peut créer un nouvel utilisateur anonyme
      const user = new User({
        email: `anon_${Date.now()}@chat.online`,
        username,
        age: ageNum,
        sexe: sexe || 'autre',
        isAnonymous: true,
        isOnline: true,
        lastSeen: new Date()
      });

      await user.save();

      // Générer un token
      const token = jwt.sign(
        { id: user._id, username: user.username, isAnonymous: true },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({
        token,
        user: {
          id: user._id,
          username: user.username,
          age: user.age,
          sexe: user.sexe,
          ville: user.ville,
          isAnonymous: true,
          role: user.role
        }
      });

    } catch (error) {
      // Gestion spécifique des erreurs de validation Mongoose
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => {
          if (err.path === 'username' && err.kind === 'minlength') {
            return 'Le nom d\'utilisateur doit contenir au moins 3 caractères';
          }
          if (err.path === 'username' && err.kind === 'maxlength') {
            return 'Le nom d\'utilisateur ne peut pas dépasser 20 caractères';
          }
          return err.message;
        });
        return res.status(400).json({ message: messages[0] || 'Données invalides' });
      }
      
      console.error('Erreur anonymousLogin:', error);
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

    // Déconnexion
    async logout(req, res) {
      try {
        const { authorization } = req.headers;
    
        if (!authorization) {
          return res.status(400).json({ message: 'Token manquant, veuillez vous reconnecter' });
        }
    
        const token = authorization.split(' ')[1];
        if (!token) {
          return res.status(400).json({ message: 'Token invalide, veuilez vous reconnecter' });
        }
    
        // Vérifier le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const isAnonymous = decoded.isAnonymous;
    
        // Rechercher l'utilisateur
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    
        user.lastSeen = new Date();
        user.isOnline = false;
    
        await user.save();
    
        return res.status(200).json({ message: 'Déconnexion réussie' });
    
      } catch (error) {
        return res.status(500).json({ message: 'Erreur serveur', error: error.message });
      }
    }  

  // Demande de réinitialisation de mot de passe
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email requis' });
      }

      const user = await User.findOne({ email, isAnonymous: false });
      if (!user) {
        // Pour des raisons de sécurité, on ne révèle pas si l'email existe
        return res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé' });
      }

      // Générer un token de réinitialisation (valide 1h)
      const resetToken = jwt.sign(
        { id: user._id, type: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Dans un vrai projet, on enverrait un email ici
      // Pour le développement, on retourne le token
      console.log(`🔑 Token de réinitialisation pour ${email}: ${resetToken}`);
      
      res.json({ 
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
        // En développement seulement
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Réinitialisation du mot de passe
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token et nouveau mot de passe requis' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
      }

      // Vérifier le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== 'password_reset') {
        return res.status(400).json({ message: 'Token invalide' });
      }

      const user = await User.findById(decoded.id);
      if (!user || user.isAnonymous) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      // Hasher le nouveau mot de passe
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Mettre à jour le mot de passe
      user.password = hashedPassword;
      await user.save();

      res.json({ message: 'Mot de passe réinitialisé avec succès' });
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(400).json({ message: 'Token invalide ou expiré' });
      }
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

}

module.exports = new AuthController();