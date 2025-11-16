const mongoose = require('mongoose');

// Lazy loading helper for better performance
const lazyRequire = (moduleName) => {
  let module;
  return () => {
    if (!module) {
      module = require(moduleName);
    }
    return module;
  };
};

const getMongoose = lazyRequire('mongoose');

const gameSchema = new mongoose.Schema({
  channel: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  currentQuestion: {
    question: String,
    options: [String], // Options de réponse
    correctAnswer: Number, // Index de la réponse correcte
    correctAnswerText: String, // Texte de la réponse correcte
    explanation: String,
    category: String, // Catégorie de la question
    categoryEmoji: String, // Emoji de la catégorie
    difficulty: String, // Difficulté (Facile, Moyen, Difficile)
    source: String, // Source de la question
    startTime: Date,
    answers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      username: String,
      answer: String,
      isCorrect: Boolean,
      responseTime: Number,
    }],
  },
  leaderboard: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    username: String,
    score: {
      type: Number,
      default: 0,
    },
  }],
  questionHistory: [{
    question: String,
    correctAnswer: String,
    explanation: String,
    answers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      username: String,
      answer: String,
      isCorrect: Boolean,
      responseTime: Number,
    }],
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware pour mettre à jour updatedAt
gameSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  
  // Validation et sanitisation des données sensibles
  if (this.currentQuestion && this.currentQuestion.question) {
    this.currentQuestion.question = this.currentQuestion.question.toString().trim();
  }
  if (this.channel) {
    this.channel = this.channel.toString().trim();
  }
  
  next();
});

// Méthode pour retourner un objet sécurisé
gameSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  return obj;
};

// Index pour améliorer les performances
gameSchema.index({ channel: 1 }, { unique: true });
gameSchema.index({ isActive: 1 });

module.exports = mongoose.model('Game', gameSchema);