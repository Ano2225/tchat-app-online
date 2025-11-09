const io = require('socket.io-client');

console.log('🔍 Test complet du système de jeu');
console.log('==================================');

const socket = io('http://localhost:8000');

let testResults = {
  connection: false,
  gameJoin: false,
  gameState: false,
  questionReceived: false,
  gameActive: false
};

socket.on('connect', () => {
  console.log('✅ 1. Connexion au serveur réussie');
  testResults.connection = true;
  
  // Simuler un utilisateur
  socket.emit('user_connected', 'TestUser');
  
  setTimeout(() => {
    console.log('🎮 2. Tentative de rejoindre le canal Game...');
    socket.emit('join_room', 'Game');
    socket.emit('join_game_channel', 'Game');
  }, 1000);
});

socket.on('game_state', (state) => {
  console.log('📊 3. État du jeu reçu:', {
    isActive: state.isActive,
    hasQuestion: !!state.currentQuestion,
    leaderboardSize: state.leaderboard?.length || 0
  });
  testResults.gameState = true;
  testResults.gameActive = state.isActive;
  
  if (state.currentQuestion) {
    console.log('❓ Question actuelle:', state.currentQuestion.question);
    testResults.questionReceived = true;
  }
});

socket.on('new_question', (question) => {
  console.log('🆕 4. Nouvelle question reçue:', question.question);
  testResults.questionReceived = true;
  
  // Simuler une réponse après 2 secondes
  setTimeout(() => {
    console.log('💬 5. Envoi d\'une réponse de test...');
    socket.emit('send_message', {
      sender: { id: 'test-user-id', username: 'TestUser' },
      content: 'Paris', // Réponse test
      room: 'Game'
    });
  }, 2000);
});

socket.on('game_started', () => {
  console.log('🚀 Jeu démarré!');
  testResults.gameJoin = true;
});

socket.on('receive_message', (message) => {
  if (message.sender.username === 'Quiz Bot') {
    console.log('🤖 Message du Quiz Bot:', message.content.substring(0, 50) + '...');
  }
});

socket.on('winner_announced', (data) => {
  console.log('🏆 Gagnant annoncé:', data.winner, 'avec', data.points, 'points');
});

socket.on('question_ended', (data) => {
  console.log('⏰ Question terminée. Réponse correcte:', data.correctAnswer);
});

socket.on('disconnect', () => {
  console.log('❌ Déconnecté du serveur');
});

socket.on('connect_error', (error) => {
  console.log('❌ Erreur de connexion:', error.message);
});

// Résumé des tests après 20 secondes
setTimeout(() => {
  console.log('\n📋 RÉSUMÉ DES TESTS');
  console.log('==================');
  console.log('Connexion:', testResults.connection ? '✅' : '❌');
  console.log('État du jeu reçu:', testResults.gameState ? '✅' : '❌');
  console.log('Jeu actif:', testResults.gameActive ? '✅' : '❌');
  console.log('Question reçue:', testResults.questionReceived ? '✅' : '❌');
  
  const allPassed = Object.values(testResults).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 TOUS LES TESTS SONT PASSÉS - Le système de jeu fonctionne!');
  } else {
    console.log('\n⚠️  CERTAINS TESTS ONT ÉCHOUÉ - Vérifiez les logs ci-dessus');
    
    if (!testResults.connection) {
      console.log('💡 Solution: Vérifiez que le serveur backend est démarré sur le port 8000');
    }
    if (!testResults.gameActive) {
      console.log('💡 Solution: Le jeu ne démarre pas automatiquement - vérifiez gameHandlers.js');
    }
    if (!testResults.questionReceived) {
      console.log('💡 Solution: Les questions ne sont pas envoyées - vérifiez questionService.js');
    }
  }
  
  process.exit(0);
}, 20000);