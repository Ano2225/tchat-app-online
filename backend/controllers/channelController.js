const Channel = require("../models/Channel")


class ChannelController {

    async getChannel(req, res) {
        try {
            const channels = await Channel.find();
            res.status(201).json(channels)
        } catch (error) {
            res.status(500).json({error : 'Erreur lors de la recuperation des canaux'})
        }
    }

    async createChannel(req, res) {
        const { name } = req.body
        try {
            const channel = new Channel({name});
            await channel.save()
            res.status(201).json(channel)
        } catch (error) {
            res.status(500).json({error : "Erreur lors de la creation du canal"})
        }
    }
}

module.exports = new ChannelController()