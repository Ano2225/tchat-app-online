require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');
const { generalLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/validation');
const {
  corsOptions,
  globalRateLimit,
  authRateLimit,
  messageRateLimit,
  helmetConfig,
  sanitizeInput: securitySanitize,
  secureLogger
} = require('./middleware/security');
const helmet = require('helmet');


class ChatServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: ["http://localhost:3000"],
        methods: ["GET", "POST"]
      }
    });

    this.initMiddlewares();
  }

  initMiddlewares() {
    // Trust proxy (important for rate limiting behind reverse proxy)
    this.app.set('trust proxy', 1);

    // Sécurité renforcée
    this.app.use(helmetConfig);
    this.app.use(cors(corsOptions));

    // Parsing et validation
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(sanitizeInput);
    this.app.use(securitySanitize);

    // Rate limiting et protection
    this.app.use(globalRateLimit);
    this.app.use(secureLogger);
  }

  async connectDatabase() {
    await connectDB();
    await this.initializeDatabase();
  }

  async initializeDatabase() {
    try {
      const Channel = require('./models/Channel');
      const Game = require('./models/Game');
      const { getRandomQuestion } = require('./services/questionService');

      // Créer canaux par défaut
      const defaultChannels = ['General', 'Music', 'Sport'];
      for (const channelName of defaultChannels) {
        const existingChannel = await Channel.findOne({ name: channelName });
        if (!existingChannel) {
          await Channel.create({ name: channelName });
          console.log(`✅ Canal "${channelName}" créé`);
        }
      }

      // Initialiser le jeu
      const existingGame = await Game.findOne({ channel: 'Game' });
      if (!existingGame) {
        const question = getRandomQuestion();
        await Game.create({
          channel: 'Game',
          isActive: true,
          currentQuestion: { ...question, startTime: new Date(), answers: [] },
          leaderboard: [],
          questionHistory: []
        });
        console.log('✅ Système de jeu initialisé');
      }
    } catch (error) {
      console.error('❌ Erreur initialisation:', error.message);
    }
  }

  setupRoutes() {
    const authBetterRoutes = require('./routes/authBetter');
    const messageRoutes = require('./routes/message');
    const channelRoutes = require('./routes/channel');
    const userRoutes = require('./routes/user');
    const uploadRoutes = require('./routes/upload');
    const adminRoutes = require('./routes/admin');
    const reportRoutes = require('./routes/reports');
    const aiAgentRoutes = require('./routes/aiAgents');

    this.app.use('/api/auth', authRateLimit, authBetterRoutes);
    this.app.use('/api/messages', messageRateLimit, messageRoutes(this.io));
    this.app.use('/api/channels', channelRoutes);
    this.app.use('/api/user', userRoutes);
    this.app.use('/api/upload', uploadRoutes);
    this.app.use('/api/admin', adminRoutes);
    this.app.use('/api/reports', reportRoutes);
    this.app.use('/api/ai-agents', aiAgentRoutes);

    // Route de santé
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });
  }

  initSocketEvents() {
    const socketHandlers = require('./socket/socketHandlers');

    this.io.on('connection', (socket) => {
      socketHandlers(this.io, socket)
    });

  }

  async start() {
    await this.connectDatabase();
    this.setupRoutes();
    this.initSocketEvents();

    const PORT = process.env.PORT || 8000;
    this.server.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    });
  }
}

const chatServer = new ChatServer();
chatServer.start().catch((error) => {
  console.error('❌ Échec du démarrage du serveur:', error);
  process.exit(1);
});
