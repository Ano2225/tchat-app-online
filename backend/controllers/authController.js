const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

      // Hacher le mot de passe
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
        ville,
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
      const { email, password } = req.body;

      // Vérifier si l'utilisateur existe
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Identifiants invalides' });
      }

      // Vérifier le mot de passe
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Identifiants invalides' });
      }

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
      // Récupérer toutes les données du corps de la requête
      const { username, age, sexe, ville } = req.body;
  
      // Vérifier si un nom d'utilisateur est fourni
      if (!username) {
        return res.status(400).json({ message: 'Le nom d\'utilisateur est requis' });
      }
  
      // Vérifier si le nom d'utilisateur est unique
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Ce nom d\'utilisateur est déjà utilisé' });
      }
  
      // Validation du nom d'utilisateur
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({ 
          message: 'Le nom d\'utilisateur doit contenir entre 3 et 30 caractères' 
        });
      }
      const randomEmail = `anon_${Date.now()}@chat.online`;

  
      // Création de l'utilisateur
      const user = new User({
        email: randomEmail,
        username,
        age: age || null,
        sexe: sexe || null,
        ville: ville || null,
        isAnonymous: true
      });
  
      await user.save();
  
      // Génération du token
      const token = jwt.sign(
        { 
          id: user._id, 
          username: user.username, 
          isAnonymous: true,
          age: user.age,
          sexe: user.sexe,
          ville: user.ville
        }, 
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
          ville: user.ville
        } 
      });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }
}

module.exports = new AuthController();