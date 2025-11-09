const io = require('socket.io-client');

console.log('Connecting to server...');
const socket = io('http://localhost:8000');

socket.on('connect', () => {
  console.log('✅ Connected to server');
  
  // Simuler un utilisateur admin
  socket.emit('user_connected', 'TestAdmin');
  
  setTimeout(() => {
    console.log('🎮 Joining Game channel...');
    socket.emit('join_room', 'Game');
    socket.emit('join_game_channel', 'Game');
  }, 1000);
});

socket.on('game_state', (state) => {
  console.log('📊 Game state:', state);
});

socket.on('new_question', (question) => {
  console.log('❓ New question:', question);
});

socket.on('game_started', () => {
  console.log('🚀 Game started!');
});

socket.on('receive_message', (message) => {
  if (message.sender.username === 'Quiz Bot') {
    console.log('🤖 Quiz Bot:', message.content);
  }
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

// Garder le script actif
setTimeout(() => {
  console.log('✅ Test completed - Game should be running');
  process.exit(0);
}, 15000);