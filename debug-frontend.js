// Script pour tester la structure des données côté frontend
const io = require('socket.io-client');

const socket = io('http://localhost:8000');

socket.on('connect', () => {
  console.log('✅ Connecté au backend');
  socket.emit('user_connected', 'DebugUser');
  
  setTimeout(() => {
    socket.emit('join_room', 'Game');
    socket.emit('join_game_channel', 'Game');
  }, 1000);
});

socket.on('game_state', (state) => {
  console.log('\n📊 STRUCTURE GAME_STATE:');
  console.log('isActive:', state.isActive);
  console.log('currentQuestion:', JSON.stringify(state.currentQuestion, null, 2));
  console.log('leaderboard length:', state.leaderboard?.length);
  
  if (state.currentQuestion) {
    console.log('\n🔍 DÉTAILS QUESTION:');
    console.log('- question:', state.currentQuestion.question);
    console.log('- options:', state.currentQuestion.options);
    console.log('- startTime:', state.currentQuestion.startTime);
    console.log('- explanation:', state.currentQuestion.explanation);
  }
});

setTimeout(() => {
  socket.disconnect();
  process.exit(0);
}, 5000);