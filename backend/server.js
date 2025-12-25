require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const tokenRoutes = require('./routes/token');
const messageRoutes = require('./routes/message');
const channelRoutes = require('./routes/channel');
const userRoutes = require('./routes/user');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');
const aiAgentRoutes = require('./routes/aiAgents');
const socketHandlers = require('./socket/socketHandlers');
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
const { bruteForceProtection } = require('./middleware/bruteForce');
const { socketAuthMiddleware } = require('./middleware/socketAuth');
const helmet = require('helmet');


class ChatServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      // Add authentication middleware
      allowRequest: (req, callback) => {
        // Allow health checks without auth
        if (req._query && req._query.healthcheck) {
          return callback(null, true);
        }
        callback(null, true);
      }
    });

    // Apply Socket.IO authentication middleware
    this.io.use(socketAuthMiddleware);

    this.initMiddlewares();
    this.connectDatabase();
    this.setupRoutes();
    this.initSocketEvents();
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

    // Brute force protection (ACTIVÉ)
    this.app.use('/api/auth/login', bruteForceProtection);
    this.app.use('/api/auth/register', bruteForceProtection);
  }

  async connectDatabase() {
    await connectDB();
    await this.initializeDatabase();
  }

  async initializeDatabase() {
    try {
      const bcrypt = require('bcryptjs');
      const User = require('./models/User');
      const Channel = require('./models/Channel');
      const Game = require('./models/Game');
      const { getRandomQuestion } = require('./services/questionService');

      // Créer admin par défaut
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      
      const existingAdmin = await User.findOne({ username: adminUsername });
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await User.create({
          username: adminUsername,
          email: process.env.ADMIN_EMAIL || 'admin@babichat.com',
          password: hashedPassword,
          role: 'admin',
          age: 25,
          sexe: 'autre',
          ville: 'Admin City',
          isAnonymous: false
        });
        console.log('✅ Admin créé:', adminUsername);
      }

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
    this.app.use('/api/auth', authRateLimit, authRoutes);
    this.app.use('/api/token', tokenRoutes);
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

    // Global error handler
    this.app.use((err, req, res, next) => {
      console.error('[ERROR]', err.stack);
      res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        code: err.code || 'INTERNAL_ERROR'
      });
    });
  }

  initSocketEvents() {
    this.io.on('connection', (socket) => {
      socketHandlers(this.io, socket)
    });

  }

  async start() {
    const PORT = process.env.PORT || 8000;
    this.server.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    });
  }
}

const chatServer = new ChatServer();
chatServer.start();