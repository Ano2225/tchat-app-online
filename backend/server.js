const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');

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
  }

  connectDatabase() {
    connectDB();
  }

  setupRoutes() {
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/chat', chatRoutes);
   
  }

  initSocketEvents() {
    this.io.on('connection', (socket) => {
      console.log('Nouveau client connecté');

      socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`Utilisateur a rejoint le salon ${room}`);
      });

      socket.on('send_message', (messageData) => {
        // Diffuser le message à tous les membres du salon
        this.io.to(messageData.room).emit('receive_message', messageData);
      });

      socket.on('disconnect', () => {
        console.log('Client déconnecté');
      });
    });
  }

  start() {
    const PORT = process.env.PORT || 5000;
    this.server.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  }
}

const chatServer = new ChatServer();
chatServer.start();