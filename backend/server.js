const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/message');
const channelRoutes = require('./routes/channel');
const userRoutes = require('./routes/user')
const socketHandlers = require('./socket/socketHandlers');
const rateLimit = require('express-rate-limit');

require('dotenv').config();

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
    this.app.use(cors());
    this.app.use(express.json());

    // Global Rate Limiting (100 requests per minute per IP)
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit to 100 requests per IP
      message: 'Too many requests, please try again in 15 minutes!' // Error message
    });

    // Apply the rate limiter to all API routes
    this.app.use('/api/', limiter);

  }

  connectDatabase() {
    connectDB();
  }

  setupRoutes() {
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/messages', messageRoutes(this.io));
    this.app.use('/api/channels', channelRoutes);
    this.app.use('/api/user',userRoutes )

   
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