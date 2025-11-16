const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');

// Get all AI agents
router.get('/', (req, res) => {
  try {
    const agents = aiService.getAllAgents();
    const agentList = Object.keys(agents).map(id => ({
      id,
      ...agents[id]
    }));
    res.json(agentList);
  } catch (error) {
    console.error('Error fetching AI agents:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des agents' });
  }
});

// Get specific agent
router.get('/:agentId', (req, res) => {
  try {
    const agent = aiService.getAgent(req.params.agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent non trouvé' });
    }
    res.json({ id: req.params.agentId, ...agent });
  } catch (error) {
    console.error('Error fetching AI agent:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'agent' });
  }
});

// Chat with agent
router.post('/chat', async (req, res) => {
  try {
    const { message, agentId, context = [] } = req.body;
    
    if (!message || !agentId) {
      return res.status(400).json({ error: 'Message et agentId requis' });
    }

    const response = await aiService.generateResponse(message, agentId, context);
    res.json({ response });
  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ error: 'Erreur lors de la génération de la réponse' });
  }
});

module.exports = router;