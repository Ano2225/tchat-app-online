const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), override: true });

// Fail fast on missing required environment variables
const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'BETTER_AUTH_SECRET',
];
const missingVars = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}
// CSRF_SECRET fails inside csrf.js — checked there to keep concerns separated

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');
const { getRedisClient } = require('./config/redis');
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
    const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')
      .map(o => o.trim());
    this.io = socketIo(this.server, {
      cors: { origin: allowedOrigins, credentials: true },
      maxHttpBufferSize: 1e6,        // 1 MB max event payload
      pingTimeout: 20000,
      pingInterval: 25000,
      perMessageDeflate: { threshold: 512 }, // compress payloads > 512 B (~60% bandwidth reduction)
      transports: ['websocket', 'polling'],   // prefer WS, fall back to polling
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
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    this.app.use(cookieParser());
    this.app.use(securitySanitize); // strip dangerous HTML/JS patterns

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

      // Créer canaux par défaut
      const defaultChannels = ['General', 'Music', 'Sport'];
      for (const channelName of defaultChannels) {
        const existingChannel = await Channel.findOne({ name: channelName });
        if (!existingChannel) {
          await Channel.create({ name: channelName });
          console.log(`✅ Canal "${channelName}" créé`);
        }
      }

      // MVP: Quiz/Game désactivé — trop lourd pour le MVP initial
      // Réactiver en décommentant le bloc ci-dessous quand le scaling est prêt.
      /*
      const Game = require('./models/Game');
      const { getRandomQuestion } = require('./services/questionService');
      const existingGame = await Game.findOne({ channel: 'Game' });
      if (!existingGame) {
        const question = getRandomQuestion();
        await Game.create({ channel: 'Game', isActive: true, currentQuestion: { ...question, startTime: new Date(), answers: [] }, leaderboard: [], questionHistory: [] });
        console.log('✅ Système de jeu initialisé');
      }
      */
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

    // Route de santé (both paths for convenience)
    const healthHandler = (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    };
    this.app.get('/health', healthHandler);
    this.app.get('/api/health', healthHandler);
  }

  async initSocketAdapter() {
    const redisClient = getRedisClient();
    if (!redisClient) return; // graceful: single-instance mode without Redis
    try {
      const { createAdapter } = require('@socket.io/redis-adapter');
      const pubClient = redisClient;
      const subClient = redisClient.duplicate();
      // ioredis auto-connects on creation — no need to call .connect()
      this.io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Socket.IO Redis adapter enabled');
    } catch (err) {
      console.error('⚠️  Socket.IO Redis adapter failed, using in-memory:', err.message);
    }
  }

  initSocketEvents() {
    const auth = require('./config/auth');
    const socketHandlers = require('./socket/socketHandlers');

    // Verify bearer token at handshake time.
    // Accepts token from handshake.auth.token (in-memory) OR session_token cookie.
    this.io.use(async (socket, next) => {
      let token = socket.handshake.auth?.token;
      // Fall back to httpOnly cookie sent in the handshake headers
      if (!token) {
        const cookieHeader = socket.handshake.headers?.cookie || '';
        const match = cookieHeader.match(/(?:^|;\s*)session_token=([^;]+)/);
        if (match) token = decodeURIComponent(match[1]);
      }
      if (!token) {
        return next(new Error('Socket authentication required'));
      }
      try {
        const result = await auth.api.getSession({
          headers: { authorization: `Bearer ${token}` }
        });
        if (!result?.user) {
          return next(new Error('Invalid or expired session'));
        }
        // Attach verified identity — these values are trusted for the entire socket lifetime
        socket.verifiedUserId  = String(result.user.id);
        socket.verifiedUsername = result.user.username || result.user.name;
        next();
      } catch {
        next(new Error('Socket authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      socketHandlers(this.io, socket);
    });
  }

  async start() {
    await this.connectDatabase();
    this.setupRoutes();
    await this.initSocketAdapter();
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
