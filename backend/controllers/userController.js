const User = require("../models/User");

class UserController  {

  async updateUserInfo(req, res) {
      try {
        const { username, age, ville } = req.body;
    
        console.log("📥 Reçu côté serveur :", { username, age, ville });
        console.log("🔑 Utilisateur connecté :", req.user);
    
        const updatedUser = await User.findByIdAndUpdate(
          req.user.id, 
          { username, age, ville },
          { new: true }
        );
    
        if (!updatedUser) {
          return res.status(404).json({ message: "Utilisateur introuvable" });
        }
    
        res.status(200).json(updatedUser);
      } catch (error) {
        console.error('❌ Erreur updateUserInfo :', error);
        res.status(500).json({ message: 'Erreur serveur' });
      }
    }
}

module.exports = new UserController();
