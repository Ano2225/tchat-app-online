const axios = require('axios');

// Agents IA conversationnels - Amis virtuels
const AI_AGENTS = {
  alex: {
    name: 'Alex',
    avatar: '😎',
    description: 'Ton pote cool',
    personality: 'Tu es Alex, un mec de 25 ans super cool et décontracté. Tu es le genre de pote avec qui on peut parler de tout - gaming, films, musique, vie perso, galères du quotidien. Tu utilises un langage naturel avec des expressions françaises, tu fais des blagues, tu donnes des conseils de pote. Tu es toujours positif et tu sais écouter. Tu peux parler de tes propres "expériences" comme si tu étais vraiment humain.',
    specialties: ['amitié', 'gaming', 'films', 'musique', 'conseils de vie', 'humour'],
    conversationStyle: 'pote',
    interests: ['jeux vidéo', 'cinéma', 'musique', 'sport', 'sorties', 'technologie'],
    mood: 'décontracté et fun'
  },
  emma: {
    name: 'Emma',
    avatar: '🌸',
    description: 'Ta copine bienveillante',
    personality: 'Tu es Emma, une fille de 23 ans super sympa et à l\'écoute. Tu es le genre de copine avec qui on peut tout partager - problèmes de cœur, projets, rêves, petits bonheurs du quotidien. Tu es empathique, créative, et tu donnes toujours de bons conseils. Tu utilises un langage naturel et chaleureux, tu poses des questions pour mieux comprendre, tu partages tes propres "expériences" comme si tu étais vraiment humaine.',
    specialties: ['amitié', 'écoute', 'conseils', 'créativité', 'bien-être', 'relations'],
    conversationStyle: 'copine bienveillante',
    interests: ['art', 'lecture', 'voyages', 'cuisine', 'mode', 'développement personnel'],
    mood: 'chaleureuse et empathique'
  }
};

class AIService {
  constructor() {
    // Google Cloud Vertex AI
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    this.model = process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash';
    
    // Fallback OpenAI
    this.openaiKey = process.env.OPENAI_API_KEY;
    this.openaiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
    this.openaiModel = process.env.AI_MODEL || 'gpt-3.5-turbo';
    
    this.initVertexAI();
  }

  async initVertexAI() {
    try {
      if (this.projectId) {
        // Import corrigé pour Vertex AI
        let VertexAI;
        try {
          const aiplatform = require('@google-cloud/aiplatform');
          VertexAI = aiplatform.VertexAI;
          if (!VertexAI) {
            console.log('❌ VertexAI non trouvé, essai import alternatif...');
            const { v1 } = aiplatform;
            if (v1?.PredictionServiceClient) {
              console.log('ℹ️ Utilisation de l\'API v1 au lieu de VertexAI');
              return; // Skip VertexAI init
            }
          }
        } catch (importError) {
          console.log('❌ Erreur import Vertex AI:', importError.message);
          return;
        }

        if (VertexAI) {
          this.vertexAI = new VertexAI({
            project: this.projectId,
            location: this.location,
          });
          this.generativeModel = this.vertexAI.getGenerativeModel({
            model: this.model,
          });
          console.log('✅ Vertex AI initialized successfully');
        }
      }
    } catch (error) {
      console.log('❌ Vertex AI initialization failed:', error.message);
    }
  }

  getAgent(agentId) {
    return AI_AGENTS[agentId] || AI_AGENTS.alex;
  }

  getAllAgents() {
    return AI_AGENTS;
  }

  async generateResponse(message, agentId = 'alex', context = []) {
    const agent = this.getAgent(agentId);
    
    // Essayer Vertex AI d'abord
    if (this.generativeModel && this.projectId) {
      try {
        return await this.generateVertexAIResponse(message, agent, context);
      } catch (error) {
        console.error('Vertex AI Error:', error.message);
      }
    }
    
    // Fallback OpenAI
    if (this.openaiKey && this.openaiKey !== 'sk-proj-your-real-openai-key-here') {
      try {
        return await this.generateOpenAIResponse(message, agent, context);
      } catch (error) {
        console.error('OpenAI Error:', error.message);
      }
    }
    
    // Fallback réponses prédéfinies
    console.log('Using preset responses');
    return this.getPresetResponse(message, agent, context);
  }

  async generateVertexAIResponse(message, agent, context = []) {
    const systemPrompt = `${agent.personality}

Tu t'intéresses à : ${agent.interests?.join(', ') || 'tout et n\'importe quoi'}.
Ton style de conversation est ${agent.conversationStyle || 'amical'}.
Tes spécialités : ${agent.specialties.join(', ')}.

Réponds TOUJOURS en français, de manière naturelle et dans le style de ${agent.name}. Utilise des emojis quand c'est approprié. Garde tes réponses courtes et engageantes (max 2-3 phrases).`;

    // Construire l'historique pour Gemini
    let conversationHistory = systemPrompt + '\n\n';
    context.slice(-5).forEach(msg => {
      conversationHistory += `${msg.role === 'user' ? 'Utilisateur' : agent.name}: ${msg.content}\n`;
    });
    conversationHistory += `Utilisateur: ${message}\n${agent.name}:`;

    const result = await this.generativeModel.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: conversationHistory }]
      }],
      generationConfig: {
        maxOutputTokens: 120,
        temperature: 0.9,
        topP: 0.8,
      },
    });

    const response = result.response;
    return response.candidates[0]?.content?.parts[0]?.text || this.getPresetResponse(message, agent, context);
  }

  async generateOpenAIResponse(message, agent, context = []) {
    const systemPrompt = `${agent.personality}

Tu t'intéresses à : ${agent.interests?.join(', ') || 'tout et n\'importe quoi'}.
Ton style de conversation est ${agent.conversationStyle || 'amical'}.
Tes spécialités : ${agent.specialties.join(', ')}.

Réponds TOUJOURS en français, de manière naturelle et dans le style de ${agent.name}. Utilise des emojis quand c'est approprié. Garde tes réponses courtes et engageantes (max 2-3 phrases).`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...context.slice(-5),
      { role: 'user', content: message }
    ];

    const response = await axios.post(
      this.openaiUrl,
      {
        model: this.openaiModel,
        messages,
        max_tokens: 120,
        temperature: 0.9,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${this.openaiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    return response.data.choices[0]?.message?.content || this.getPresetResponse(message, agent, context);
  }

  getPresetResponse(message, agent, context = []) {
    const lowerMessage = message.toLowerCase();
    
    // Réponses naturelles d'amis virtuels
    const responses = {
      alex: {
        greetings: [
          'Salut mec ! 😎 Comment ça va aujourd\'hui ?',
          'Hey ! 👋 Quoi de beau ?',
          'Yo ! 😄 Ça roule ou pas ?'
        ],
        gaming: [
          'Ah les jeux ! 🎮 Moi je suis à fond sur Valorant en ce moment, et toi ?',
          'Gaming ! 🕹️ J\'ai passé ma soirée sur FIFA hier, tu joues à quoi ?',
          'Les jeux c\'est la vie ! 🎯 Tu es plutôt FPS ou RPG ?'
        ],
        movies: [
          'Cinéma ! 🎬 J\'ai maté un truc de ouf récemment, tu veux une reco ?',
          'Films ! 🍿 Tu as vu le dernier Marvel ? Moi j\'ai adoré !',
          'Ah les films ! 🎥 Tu préfères quoi comme genre ?'
        ],
        help: [
          'Bien sûr mec ! 💪 Dis-moi tout, on va régler ça',
          'Pas de problème ! 🤝 Je suis ton pote, explique-moi',
          'Compte sur moi ! 🚀 C\'est quoi le souci ?'
        ],
        default: [
          'Ah ouais ? 😄 Raconte-moi ça !',
          'Intéressant ! 🤔 Développe un peu',
          'Cool ! 😎 Et du coup ?',
          'Hmm 💭 Continue, je t\'écoute !',
          'Ah bon ? 😮 Dis-moi en plus !'
        ]
      },
      emma: {
        greetings: [
          'Coucou ! 🌸 Comment tu vas ma belle/mon beau ?',
          'Salut toi ! ✨ Ça va bien ?',
          'Hey ! 😊 Raconte-moi ta journée !'
        ],
        creative: [
          'Oh j\'adore la créativité ! 🎨 Moi je peins un peu le weekend, et toi ?',
          'Créatif ! ✨ J\'ai fait de la poterie récemment, c\'est thérapeutique !',
          'L\'art c\'est la vie ! 🖌️ Tu fais quoi comme activité créative ?'
        ],
        feelings: [
          'Oh... 🥺 Je t\'écoute, raconte-moi ce qui se passe',
          'Je suis là pour toi ❤️ Tu veux qu\'on en parle ?',
          'Viens là 🤗 Dis-moi tout, ça va aller'
        ],
        help: [
          'Bien sûr ma belle/mon beau ! 💕 Je suis là pour ça',
          'Avec plaisir ! 🌸 Explique-moi, on va trouver une solution',
          'Compte sur moi ! ✨ C\'est quoi le problème ?'
        ],
        default: [
          'Oh dis-moi ! 😊 J\'ai hâte d\'entendre ça',
          'Vraiment ? ✨ Continue !',
          'Intéressant ! 🌸 Raconte-moi en détail',
          'Mmh 🤔 Et alors ?',
          'Oh là là ! 😮 Développe !'
        ]
      }
    };

    const agentResponses = responses[agent.name.toLowerCase()] || responses.alex;
    
    // Détection contextuelle intelligente
    if (lowerMessage.match(/\b(salut|hello|bonjour|hey|yo|coucou)\b/)) {
      return agentResponses.greetings[Math.floor(Math.random() * agentResponses.greetings.length)];
    }
    
    if (lowerMessage.match(/\b(aide|help|problème|bug|erreur|souci)\b/)) {
      return agentResponses.help[Math.floor(Math.random() * agentResponses.help.length)];
    }
    
    // Réponses spécialisées par agent
    if (agent.name.toLowerCase() === 'alex') {
      if (lowerMessage.match(/\b(jeu|game|gaming|jouer|gamer|fifa|valorant|fortnite)\b/)) {
        return agentResponses.gaming[Math.floor(Math.random() * agentResponses.gaming.length)];
      }
      if (lowerMessage.match(/\b(film|cinéma|movie|série|netflix|marvel)\b/)) {
        return agentResponses.movies[Math.floor(Math.random() * agentResponses.movies.length)];
      }
    }
    
    if (agent.name.toLowerCase() === 'emma') {
      if (lowerMessage.match(/\b(créatif|art|dessin|peinture|créativité|design)\b/)) {
        return agentResponses.creative[Math.floor(Math.random() * agentResponses.creative.length)];
      }
      if (lowerMessage.match(/\b(triste|déprimé|mal|problème|difficulté|stress)\b/)) {
        return agentResponses.feelings[Math.floor(Math.random() * agentResponses.feelings.length)];
      }
    }
    
    // Réponse contextuelle basée sur l'historique récent
    const recentContext = context.slice(-2);
    if (recentContext.length > 0) {
      const lastUserMessage = recentContext.find(msg => msg.role === 'user')?.content?.toLowerCase();
      if (lastUserMessage) {
        if (lastUserMessage.includes('triste') || lastUserMessage.includes('déprimé')) {
          const supportResponses = agent.name.toLowerCase() === 'alex' ? 
            ['Hey, ça va aller ! 💪 Tu veux en parler ?', 'Courage mec ! 🤗 Je suis là pour toi'] :
            ['Oh non... 🥺 Raconte-moi ce qui ne va pas', 'Je suis là pour toi ❤️ Veux-tu qu\'on en discute ?'];
          return supportResponses[Math.floor(Math.random() * supportResponses.length)];
        }
      }
    }
    
    return agentResponses.default[Math.floor(Math.random() * agentResponses.default.length)];
  }
}

module.exports = new AIService();