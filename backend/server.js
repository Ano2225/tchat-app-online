require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/message');
const channelRoutes = require('./routes/channel');
const userRoutes = require('./routes/user');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');
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
  secureLogger,
  checkBruteForce
} = require('./middleware/security');
const helmet = require('helmet');


class ChatServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.initMiddlewares();
    this.connectDatabase();
    this.setupRoutes();
    this.initSocketEvents();
  }

  initMiddlewares() {
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
    // this.app.use(checkBruteForce); // Désactivé
  }

  connectDatabase() {
    connectDB();
  }

  setupRoutes() {
    this.app.use('/api/auth', authRateLimit, authRoutes);
    this.app.use('/api/messages', messageRateLimit, messageRoutes(this.io));
    this.app.use('/api/channels', channelRoutes);
    this.app.use('/api/user', userRoutes);
    this.app.use('/api/upload', uploadRoutes);
    this.app.use('/api/admin', adminRoutes);
    this.app.use('/api/reports', reportRoutes);

    // Route de santé
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });
  }

  initSocketEvents() {
    this.io.on('connection', (socket) => {
      socketHandlers(this.io, socket)
    });

  }

  start() {
    const PORT = process.env.PORT || 8000;
    this.server.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  }
}

const chatServer = new ChatServer();
chatServer.start();