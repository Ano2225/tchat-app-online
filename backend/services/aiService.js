const axios = require('axios');

// Agents IA de secours
const AI_AGENTS = {
  alex: {
    name: 'Alex',
    avatar: '👨💬',
    description: 'Assistant virtuel',
    personality: 'Tu es Alex, un assistant virtuel amical et serviable. Tu écoutes et réponds de manière bienveillante pour aider les utilisateurs.',
    specialties: ['conversation', 'aide', 'soutien']
  },
  emma: {
    name: 'Emma',
    avatar: '👩💬',
    description: 'Assistante virtuelle',
    personality: 'Tu es Emma, une assistante virtuelle chaleureuse et à l\'écoute. Tu aides les utilisateurs avec empathie et bienveillance.',
    specialties: ['conversation', 'aide', 'soutien']
  }
};

class AIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
    this.apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
    this.model = process.env.AI_MODEL || 'gpt-3.5-turbo';
  }

  getAgent(agentId) {
    return AI_AGENTS[agentId] || AI_AGENTS.julie;
  }

  getAllAgents() {
    return AI_AGENTS;
  }

  async generateResponse(message, agentId = 'julie', context = []) {
    try {
      const agent = this.getAgent(agentId);
      
      // Utiliser l'API si configurée, sinon réponses prédéfinies
      if (!this.apiKey) {
        console.log('No API key configured, using preset responses');
        return this.getPresetResponse(message, agent);
      }

      const messages = [
        {
          role: 'system',
          content: `${agent.personality} Réponds en français de manière naturelle et dans le style de ${agent.name}.`
        },
        ...context.slice(-5),
        {
          role: 'user',
          content: message
        }
      ];

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages,
          max_tokens: 150,
          temperature: 0.8
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const aiResponse = response.data.choices[0]?.message?.content;
      if (!aiResponse) {
        console.log('No AI response received, using preset response');
        return this.getPresetResponse(message, agent);
      }
      return aiResponse;
    } catch (error) {
      console.error('AI Service Error:', error.message);
      console.log('Falling back to preset responses');
      const agent = this.getAgent(agentId);
      return this.getPresetResponse(message, agent);
    }
  }

  getPresetResponse(message, agent) {
    const lowerMessage = message.toLowerCase();
    
    // Réponses basées sur l'agent
    const responses = {
      alex: {
        greetings: ['Salut ! Je suis Alex 👋 Comment puis-je t\'aider ?', 'Hello ! Ravi de discuter avec toi !'],
        default: ['Intéressant ! Raconte-moi en plus 😊', 'Je t\'écoute, dis-moi ce qui te préoccupe']
      },
      emma: {
        greetings: ['Coucou ! Je suis Emma 🌸 Comment ça va ?', 'Salut ! Heureuse de te rencontrer !'],
        default: ['Je comprends 🤗', 'N\'hésite pas à me parler de tout 💕']
      }
    };

    const agentResponses = responses[agent.name.toLowerCase()] || responses.alex;
    
    if (lowerMessage.includes('salut') || lowerMessage.includes('hello') || lowerMessage.includes('bonjour')) {
      return agentResponses.greetings[Math.floor(Math.random() * agentResponses.greetings.length)];
    }
    
    // Réponses spécialisées selon les spécialités de l'agent
    for (const specialty of agent.specialties) {
      if (lowerMessage.includes(specialty)) {
        const specialResponses = agentResponses[specialty] || agentResponses.default;
        return specialResponses[Math.floor(Math.random() * specialResponses.length)];
      }
    }
    
    return agentResponses.default[Math.floor(Math.random() * agentResponses.default.length)];
  }
}

module.exports = new AIService();