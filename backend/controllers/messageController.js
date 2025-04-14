const Message = require("../models/Message");


class MessageController {
    //Get Message By Channel
    async getMessagesByChanel(req, res) {
        const { room  } = req.params;
        try {
            const messages = await Message.find({ room })
            .populate('sender', 'username email') // <- récupère username & email
            .sort({ createdAt: 1 });
            res.status(201).json(messages)

        } catch(error) {
            console.error('Erreur lors de la récupération des messages :', error);
            res.status(500).json({ error: "Erreur interne lors de la récupération des messages." });
        }
    } 

    //Send Message 
    async createMessage(req, res) {
        const { content, sender, room } = req.body;

        if (!content || !sender || !room) {
            return res.status(400).json({ error: "Tous les champs sont requis." });
        }

        try {
        const message = await Message.create({
            content,
            sender,
            room,
        });

        await message.populate('sender', 'username email');

        res.status(201).json(message);
        } catch (error) {
        console.error('Erreur lors de l\'envoi du message :', error);
        res.status(500).json({ error: "Échec de l'envoi du message." });
        }
    }
}

module.exports = new MessageController();