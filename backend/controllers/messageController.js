const Message = require("../models/Message");

class MessageController {

  // Récupérer les messages publics d'une room
  async getMessagesByChanel(req, res) {
    const { room } = req.params;
    try {
      const messages = await Message.find({ room })
        .populate('sender', 'username email')
        .sort({ createdAt: 1 });

      res.status(200).json(messages);
    } catch (error) {
      console.error('Erreur lors de la récupération des messages :', error);
      res.status(500).json({ error: "Erreur interne lors de la récupération des messages." });
    }
  }

  // Envoyer un message dans une room publique
  async createMessage(req, res) {
    const { content, sender, room } = req.body;

    if (!content || !sender || !room) {
      return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    try {
      const message = await Message.create({ content, sender, room });
      await message.populate('sender', 'username email');
      res.status(201).json(message);
    } catch (error) {
      console.error("Erreur lors de l'envoi du message :", error);
      res.status(500).json({ error: "Échec de l'envoi du message." });
    }
  }

  //  Récupérer l'historique des messages privés entre deux utilisateurs
  async getPrivateMessages(req, res) {
    const { userId, recipientId } = req.params;

    try {
      const messages = await Message.find({
        $or: [
          { sender: userId, recipient: recipientId },
          { sender: recipientId, recipient: userId }
        ]
      })
      .populate('sender', 'username email')
      .sort({ createdAt: 1 });

      res.status(200).json(messages);
    } catch (error) {
      console.error("Erreur lors de la récupération des messages privés :", error);
      res.status(500).json({ error: "Erreur interne lors de la récupération des messages privés." });
    }
  }

  // Envoyer un message privé
  async sendPrivateMessage(req, res) {
    const { content, sender, recipient } = req.body;

    if (!content || !sender || !recipient) {
      return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    try {
      const message = await Message.create({
        content,
        sender,
        recipient,
      });

      await message.populate('sender', 'username email');
      res.status(201).json(message);
    } catch (error) {
      console.error("Erreur lors de l'envoi du message privé :", error);
      res.status(500).json({ error: "Échec de l'envoi du message privé." });
    }
  }
}

module.exports = new MessageController();
