const axios = require('axios');

// 🔑 Clé API DeepL (à mettre dans ton .env)
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

// Configuration des catégories Open Trivia DB
const TRIVIA_CATEGORIES = {
  9: { name: 'Culture générale', emoji: '🧠' },
  10: { name: 'Livres', emoji: '📚' },
  11: { name: 'Films', emoji: '🎬' },
  12: { name: 'Musique', emoji: '🎵' },
  14: { name: 'Télévision', emoji: '📺' },
  15: { name: 'Jeux vidéo', emoji: '🎮' },
  17: { name: 'Sciences', emoji: '🔬' },
  18: { name: 'Informatique', emoji: '💻' },
  19: { name: 'Mathématiques', emoji: '🔢' },
  20: { name: 'Mythologie', emoji: '⚡' },
  21: { name: 'Sports', emoji: '⚽' },
  22: { name: 'Géographie', emoji: '🌍' },
  23: { name: 'Histoire', emoji: '📜' },
  24: { name: 'Politique', emoji: '🏛️' },
  25: { name: 'Art', emoji: '🎨' },
  26: { name: 'Célébrités', emoji: '⭐' },
  27: { name: 'Animaux', emoji: '🐾' },
  28: { name: 'Véhicules', emoji: '🚗' }
};

const DIFFICULTIES = ['easy', 'medium', 'hard'];

// Cache pour éviter les questions répétées
const questionCache = new Set();
const MAX_CACHE_SIZE = 1000;

// Questions de secours en cas d'échec de l'API
const fallbackQuestions = [
  {
    question: "Quelle est la capitale de la France ?",
    options: ["Paris", "Lyon", "Marseille", "Toulouse"],
    correctAnswer: 0,
    correctAnswerText: "Paris",
    category: "Géographie",
    categoryEmoji: "🌍",
    difficulty: "Facile",
    explanation: "Paris est la capitale de la France depuis 987."
  },
  {
    question: "Qui a peint la Joconde ?",
    options: ["Picasso", "Van Gogh", "Leonardo da Vinci", "Monet"],
    correctAnswer: 2,
    correctAnswerText: "Leonardo da Vinci",
    category: "Art",
    categoryEmoji: "🎨",
    difficulty: "Moyen",
    explanation: "Leonardo da Vinci a peint la Joconde entre 1503 et 1519."
  },
  {
    question: "Combien de continents y a-t-il ?",
    options: ["5", "6", "7", "8"],
    correctAnswer: 2,
    correctAnswerText: "7",
    category: "Géographie",
    categoryEmoji: "🌍",
    difficulty: "Facile",
    explanation: "Il y a 7 continents : Afrique, Antarctique, Asie, Europe, Amérique du Nord, Océanie et Amérique du Sud."
  },
  {
    question: "Quel est le plus grand océan du monde ?",
    options: ["Atlantique", "Pacifique", "Indien", "Arctique"],
    correctAnswer: 1,
    correctAnswerText: "Pacifique",
    category: "Géographie",
    categoryEmoji: "🌍",
    difficulty: "Facile",
    explanation: "L'océan Pacifique couvre environ 46% de la surface des océans."
  },
  {
    question: "En quelle année a eu lieu la première mission sur la Lune ?",
    options: ["1967", "1969", "1971", "1973"],
    correctAnswer: 1,
    correctAnswerText: "1969",
    category: "Histoire",
    categoryEmoji: "📜",
    difficulty: "Moyen",
    explanation: "Apollo 11 a atterri sur la Lune le 20 juillet 1969."
  },
  {
    question: "Combien d'os y a-t-il dans le corps humain adulte ?",
    options: ["186", "206", "226", "246"],
    correctAnswer: 1,
    correctAnswerText: "206",
    category: "Sciences",
    categoryEmoji: "🔬",
    difficulty: "Moyen",
    explanation: "Un adulte a 206 os, contre 270 à la naissance."
  },
  {
    question: "Quel est l'élément chimique de symbole 'O' ?",
    options: ["Or", "Oxygène", "Osmium", "Oxyde"],
    correctAnswer: 1,
    correctAnswerText: "Oxygène",
    category: "Sciences",
    categoryEmoji: "🔬",
    difficulty: "Facile",
    explanation: "L'oxygène a pour symbole O dans le tableau périodique."
  },
  {
    question: "Combien de joueurs y a-t-il dans une équipe de football ?",
    options: ["10", "11", "12", "13"],
    correctAnswer: 1,
    correctAnswerText: "11",
    category: "Sports",
    categoryEmoji: "⚽",
    difficulty: "Facile",
    explanation: "Une équipe de football compte 11 joueurs sur le terrain."
  }
];

// Utilitaires
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const decodeHtml = (html) => {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&apos;': "'",
    '&nbsp;': ' '
  };
  return html.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
};

const translateDifficulty = (difficulty) => {
  const translations = {
    'easy': 'Facile',
    'medium': 'Moyen',
    'hard': 'Difficile'
  };
  return translations[difficulty] || difficulty;
};

/**
 * Traduire un tableau de textes en français avec DeepL.
 * Si DEEPL_API_KEY est absente ou en cas d'erreur, on renvoie les textes d'origine.
 */
const translateTextsToFrench = async (texts) => {
  // Si pas de clé configurée → on ne traduit pas
  if (!DEEPL_API_KEY) {
    console.warn('[TRIVIA_API] DEEPL_API_KEY not set, skipping translation');
    return texts;
  }

  try {
    const params = new URLSearchParams();
    texts.forEach((t) => params.append('text', t));
    params.append('target_lang', 'FR');

    const response = await axios.post(
      'https://api-free.deepl.com/v2/translate', // si tu as un plan Pro: https://api.deepl.com/v2/translate
      params,
      {
        headers: {
          'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 5000
      }
    );

    const translations = response.data.translations || [];
    if (translations.length !== texts.length) {
      console.warn('[TRIVIA_API] DeepL returned unexpected number of translations, using original texts');
      return texts;
    }

    return translations.map((t) => t.text);

  } catch (err) {
    console.error('[TRIVIA_API] Error translating with DeepL:', err.message);
    return texts;
  }
};

// Fonction principale pour récupérer une question
const getRandomQuestion = async () => {
  try {
    // Sélectionner une catégorie et difficulté aléatoires
    const categoryIds = Object.keys(TRIVIA_CATEGORIES);
    const randomCategoryId = categoryIds[Math.floor(Math.random() * categoryIds.length)];
    const randomDifficulty = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];
    
    console.log(`[TRIVIA_API] Fetching question - Category: ${randomCategoryId}, Difficulty: ${randomDifficulty}`);
    
    // Appel à l'API Open Trivia DB
    const response = await axios.get('https://opentdb.com/api.php', {
      params: {
        amount: 1,
        category: randomCategoryId,
        difficulty: randomDifficulty,
        type: 'multiple'
      },
      timeout: 5000
    });
    
    if (response.data.response_code !== 0 || !response.data.results || response.data.results.length === 0) {
      console.log(`[TRIVIA_API] API returned no results, using fallback`);
      return getFallbackQuestion();
    }
    
    const triviaQuestion = response.data.results[0];
    
    // Vérifier si la question a déjà été utilisée récemment
    const questionKey = triviaQuestion.question;
    if (questionCache.has(questionKey)) {
      console.log(`[TRIVIA_API] Question already used, trying again`);
      return getRandomQuestion(); // Récursion pour une nouvelle question
    }
    
    // Ajouter au cache
    questionCache.add(questionKey);
    if (questionCache.size > MAX_CACHE_SIZE) {
      const firstKey = questionCache.values().next().value;
      questionCache.delete(firstKey);
    }
    
    // Décoder les entités HTML (version originale EN)
    const questionEn = decodeHtml(triviaQuestion.question);
    const correctAnswerEn = decodeHtml(triviaQuestion.correct_answer);
    const incorrectAnswersEn = triviaQuestion.incorrect_answers.map(decodeHtml);

    // 🔁 Traduction en FR (question + bonne réponse + mauvaises réponses)
    const textsToTranslate = [questionEn, correctAnswerEn, ...incorrectAnswersEn];
    const translated = await translateTextsToFrench(textsToTranslate);

    const questionFr = translated[0];
    const correctAnswerFr = translated[1];
    const incorrectAnswersFr = translated.slice(2);

    // Créer le tableau d'options mélangées (en FR)
    const allOptionsFr = [correctAnswerFr, ...incorrectAnswersFr];
    const shuffledOptions = shuffleArray(allOptionsFr);
    const correctIndex = shuffledOptions.findIndex(option => option === correctAnswerFr);
    
    const categoryInfo = TRIVIA_CATEGORIES[randomCategoryId] || { name: 'Divers', emoji: '❓' };
    
    const formattedQuestion = {
      question: questionFr,
      options: shuffledOptions,
      correctAnswer: correctIndex,
      correctAnswerText: correctAnswerFr,
      category: categoryInfo.name,
      categoryEmoji: categoryInfo.emoji,
      difficulty: translateDifficulty(triviaQuestion.difficulty),
      explanation: `La bonne réponse était : ${correctAnswerFr}`,
      source: 'Open Trivia DB + DeepL'
    };
    
    console.log(`[TRIVIA_API] ✅ Question generated: ${questionFr}`);
    console.log(`[TRIVIA_API] Category: ${categoryInfo.emoji} ${categoryInfo.name} | Difficulty: ${translateDifficulty(triviaQuestion.difficulty)}`);
    
    return formattedQuestion;
    
  } catch (error) {
    console.error(`[TRIVIA_API] Error fetching question:`, error.message);
    return getFallbackQuestion();
  }
};

// Fonction de secours
const getFallbackQuestion = () => {
  const randomIndex = Math.floor(Math.random() * fallbackQuestions.length);
  const question = { ...fallbackQuestions[randomIndex] };
  
  // Remélanger les options
  const correctAnswerText = question.correctAnswerText;
  question.options = shuffleArray(question.options);
  question.correctAnswer = question.options.findIndex(option => option === correctAnswerText);
  question.source = 'Questions locales';
  question.explanation = `La bonne réponse était : ${correctAnswerText}. ${question.explanation}`;
  
  console.log(`[TRIVIA_API] 🔄 Using fallback question: ${question.question}`);
  return question;
};

// Fonction pour obtenir des statistiques sur les catégories
const getCategoryStats = async () => {
  try {
    const response = await axios.get('https://opentdb.com/api_count_global.php', {
      timeout: 3000
    });
    return response.data;
  } catch (error) {
    console.error('[TRIVIA_API] Error fetching category stats:', error.message);
    return null;
  }
};

// Fonction pour réinitialiser le cache
const clearQuestionCache = () => {
  questionCache.clear();
  console.log('[TRIVIA_API] Question cache cleared');
};

module.exports = { 
  getRandomQuestion, 
  getCategoryStats, 
  clearQuestionCache,
  TRIVIA_CATEGORIES 
};
