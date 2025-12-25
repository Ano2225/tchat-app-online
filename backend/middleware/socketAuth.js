const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware d'authentification pour Socket.IO
 * Vérifie le token JWT et attache les infos utilisateur au socket
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    // Récupérer le token depuis le handshake
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.log(`[SOCKET_AUTH] No token provided for socket: ${socket.id}`);
      return next(new Error('Authentication required'));
    }

    // Vérifier le token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded || !decoded.id) {
      console.log(`[SOCKET_AUTH] Invalid token structure for socket: ${socket.id}`);
      return next(new Error('Invalid token'));
    }

    // Vérifier que l'utilisateur existe et n'est pas bloqué
    const user = await User.findById(decoded.id);
    
    if (!user) {
      console.log(`[SOCKET_AUTH] User not found for socket: ${socket.id}`);
      return next(new Error('User not found'));
    }

    if (user.isBlocked && !user.isAnonymous) {
      console.log(`[SOCKET_AUTH] Blocked user attempted connection: ${user.username}`);
      return next(new Error('Account blocked'));
    }

    // Attacher les informations utilisateur au socket
    socket.userId = user._id.toString();
    socket.username = user.username;
    socket.userRole = user.role;
    socket.isAnonymous = user.isAnonymous;
    socket.authenticated = true;

    console.log(`[SOCKET_AUTH] ✅ User authenticated: ${user.username} (${socket.id})`);
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      console.log(`[SOCKET_AUTH] Invalid token for socket: ${socket.id}`);
      return next(new Error('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      console.log(`[SOCKET_AUTH] Expired token for socket: ${socket.id}`);
      return next(new Error('Token expired'));
    }
    console.error(`[SOCKET_AUTH] Error:`, error.message);
    return next(new Error('Authentication failed'));
  }
};

/**
 * Middleware pour vérifier l'authentification dans les handlers
 */
const requireAuth = (handler) => {
  return async (...args) => {
    const socket = args[args.length - 1];
    
    if (!socket.authenticated || !socket.userId) {
      console.log(`[SOCKET_AUTH] Unauthorized action attempt from socket: ${socket.id}`);
      socket.emit('error', { message: 'Authentication required' });
      return;
    }
    
    return handler(...args);
  };
};

/**
 * Middleware pour vérifier le rôle admin
 */
const requireAdmin = (handler) => {
  return async (...args) => {
    const socket = args[args.length - 1];
    
    if (!socket.authenticated || socket.userRole !== 'admin') {
      console.log(`[SOCKET_AUTH] Unauthorized admin action from socket: ${socket.id}`);
      socket.emit('error', { message: 'Admin access required' });
      return;
    }
    
    return handler(...args);
  };
};

module.exports = {
  socketAuthMiddleware,
  requireAuth,
  requireAdmin
};

