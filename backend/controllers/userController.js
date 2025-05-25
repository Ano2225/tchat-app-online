const User = require("../models/User");

class UserController  {

  async updateUserInfo(req, res) {
      try {
        const { username, age, ville, avatarUrl } = req.body;
    
        console.log("📥 Reçu côté serveur :", { username, age, ville, avatarUrl });
        console.log("🔑 Utilisateur connecté :", req.user);
    
        const updatedUser = await User.findByIdAndUpdate(
          req.user.id, 
          { username, age, ville, avatarUrl },
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

    async getUserById(req, res) {
      try {
        const { id } = req.params;

        const user = await User.findById(id).select("-password -email -createdAt -updatedAt");
        
        if(!user){
          res.status(404).json({message: 'Utilisateur non trouvé'})
        }

        res.status(200).json(user)
      } catch (error) {
        console.error("❌ Erreur getUserById :", error);
        res.status(500).json({ message: "Erreur serveur" });
      }
    }
}

module.exports = new UserController();
