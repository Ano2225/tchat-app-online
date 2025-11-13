const User = require("../models/User");

class UserController  {

  async updateUserInfo(req, res) {
      try {
        const { username, age, ville, avatarUrl, bgColor } = req.body;
    
        console.log("📥 Reçu côté serveur :", { username, age, ville, avatarUrl, bgColor });
        console.log("🔑 Utilisateur connecté :", req.user);
    
        const updateData = { username, age, ville };
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
        if (bgColor) updateData.bgColor = bgColor;
    
        const updatedUser = await User.findByIdAndUpdate(
          req.user.id, 
          updateData,
          { new: true }
        ).select('-password');
    
        if (!updatedUser) {
          return res.status(404).json({ message: "Utilisateur introuvable" });
        }
    
        res.status(200).json(updatedUser);
      } catch (error) {
        console.error('❌ Erreur updateUserInfo :', error);
        res.status(500).json({ message: 'Erreur serveur' });
      }
    }

    async getCurrentUserProfile(req, res) {
      try {
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
          return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.status(200).json(user);
      } catch (error) {
        console.error('❌ Erreur getCurrentUserProfile :', error);
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
