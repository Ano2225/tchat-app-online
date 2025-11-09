const io = require('socket.io-client');

const socket = io('http://localhost:8000');

socket.on('connect', () => {
  console.log('Connected to server');
  
  // Simuler un utilisateur qui rejoint le canal Game
  socket.emit('user_connected', 'TestUser');
  socket.emit('join_room', 'Game');
  socket.emit('join_game_channel', 'Game');
});

socket.on('game_state', (state) => {
  console.log('Game state received:', state);
});

socket.on('new_question', (question) => {
  console.log('New question received:', question);
});

socket.on('game_started', () => {
  console.log('Game started!');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Garder le script actif
setTimeout(() => {
  console.log('Test completed');
  process.exit(0);
}, 10000);