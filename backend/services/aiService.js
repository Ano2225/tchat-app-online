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

// Groq free-tier model — fast and capable
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

class AIService {
  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY;
    if (!this.groqApiKey) {
      console.warn('⚠️  GROQ_API_KEY manquante — les réponses IA utiliseront le mode preset');
    } else {
      console.log(`🤖 AI Provider: Groq (${GROQ_MODEL})`);
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

    if (!this.groqApiKey) {
      return this.getPresetResponse(message, agent, context);
    }

    try {
      return await this.generateGroqResponse(message, agent, context);
    } catch (error) {
      console.error('❌ Groq Error:', error.message);
      throw new Error(`Erreur lors de la génération de la réponse: ${error.message}`);
    }
  }

  async generateGroqResponse(message, agent, context = []) {
    const systemPrompt = `${agent.personality}

Tu t'intéresses à : ${agent.interests.join(', ')}.
Ton style de conversation est ${agent.conversationStyle}.
Tes spécialités : ${agent.specialties.join(', ')}.

Réponds TOUJOURS en français, de manière naturelle et dans le style de ${agent.name}. Utilise des emojis quand c'est approprié. Garde tes réponses courtes et engageantes (max 2-3 phrases).`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...context.slice(-5),
      { role: 'user', content: message }
    ];

    const response = await axios.post(
      `${GROQ_BASE_URL}/chat/completions`,
      {
        model: GROQ_MODEL,
        messages,
        max_tokens: 120,
        temperature: 0.9,
        top_p: 0.8
      },
      {
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    return response.data.choices?.[0]?.message?.content || this.getPresetResponse(message, agent, context);
  }

  getPresetResponse(message, agent, context = []) {
    const lowerMessage = message.toLowerCase();

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

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const agentResponses = responses[agent.name.toLowerCase()] || responses.alex;

    if (lowerMessage.match(/\b(salut|hello|bonjour|hey|yo|coucou)\b/)) return pick(agentResponses.greetings);
    if (lowerMessage.match(/\b(aide|help|problème|bug|erreur|souci)\b/)) return pick(agentResponses.help);

    if (agent.name.toLowerCase() === 'alex') {
      if (lowerMessage.match(/\b(jeu|game|gaming|jouer|gamer|fifa|valorant|fortnite)\b/)) return pick(agentResponses.gaming);
      if (lowerMessage.match(/\b(film|cinéma|movie|série|netflix|marvel)\b/)) return pick(agentResponses.movies);
    }

    if (agent.name.toLowerCase() === 'emma') {
      if (lowerMessage.match(/\b(créatif|art|dessin|peinture|créativité|design)\b/)) return pick(agentResponses.creative);
      if (lowerMessage.match(/\b(triste|déprimé|mal|problème|difficulté|stress)\b/)) return pick(agentResponses.feelings);
    }

    const recentContext = context.slice(-2);
    if (recentContext.length > 0) {
      const lastUserMsg = recentContext.find(msg => msg.role === 'user')?.content?.toLowerCase();
      if (lastUserMsg?.match(/triste|déprimé/)) {
        const supportResponses = agent.name.toLowerCase() === 'alex'
          ? ['Hey, ça va aller ! 💪 Tu veux en parler ?', 'Courage mec ! 🤗 Je suis là pour toi']
          : ['Oh non... 🥺 Raconte-moi ce qui ne va pas', 'Je suis là pour toi ❤️ Veux-tu qu\'on en discute ?'];
        return pick(supportResponses);
      }
    }

    return pick(agentResponses.default);
  }
}

module.exports = new AIService();
