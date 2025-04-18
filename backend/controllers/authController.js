const User = require('../models/User');
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

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Créer un nouvel utilisateur
      user = new User({
        username,
        email,
        password: hashedPassword,
        isAnonymous: false,
        age,
        sexe,
        ville: ville || null,
      });

      await user.save();

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

      // Vérifier si l'utilisateur existe
     const user = await User.findOne({username, isAnonymous: false});
     if(!user) {
      return res.status(400).json({message : 'Identifiants invalides'});
     }

      // Vérifier le mot de passe
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Identifiants invalides' });
      }

      //Mettre à jour la date de dernier accès 
      user.lastSeen = new Date();
      user.isOnline = true;
      await user.save();

      // Générer un token JWT
      const token = jwt.sign(
        { id: user._id, username: user.username }, 
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({ token, user: { id: user._id, username: user.username } });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Connexion anonyme
  async anonymousLogin(req, res) {
    try {
      const { username, age, sexe, ville } = req.body;

      if (!username) {
        return res.status(400).json({ message: 'Le nom d\'utilisateur est requis' });
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
        age,
        sexe,
        ville: ville || null,
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
        }
      });

    } catch (error) {
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

}

module.exports = new AuthController();