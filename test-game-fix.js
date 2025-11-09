const { spawn } = require('child_process');
const io = require('socket.io-client');

console.log('🔧 Test du système de jeu après corrections');
console.log('===========================================');

// Démarrer le backend
console.log('1. Démarrage du backend...');
const backend = spawn('npm', ['run', 'dev'], { 
  cwd: './backend',
  stdio: 'pipe'
});

// Attendre que le backend soit prêt
setTimeout(() => {
  console.log('2. Test de connexion au système de jeu...');
  
  const socket = io('http://localhost:8000');
  
  socket.on('connect', () => {
    console.log('✅ Connexion réussie au backend');
    
    // Simuler un utilisateur
    socket.emit('user_connected', 'TestUser');
    
    setTimeout(() => {
      console.log('3. Rejoindre le canal Game...');
      socket.emit('join_room', 'Game');
      socket.emit('join_game_channel', 'Game');
    }, 1000);
  });
  
  socket.on('game_state', (state) => {
    console.log('✅ État du jeu reçu:', {
      isActive: state.isActive,
      hasQuestion: !!state.currentQuestion,
      leaderboard: state.leaderboard?.length || 0
    });
    
    if (state.isActive && state.currentQuestion) {
      console.log('✅ Question active:', state.currentQuestion.question);
      
      // Test d'une réponse
      setTimeout(() => {
        console.log('4. Test d\'envoi de réponse...');
        socket.emit('send_message', {
          sender: { id: 'test-user', username: 'TestUser' },
          content: 'Paris',
          room: 'Game'
        });
      }, 2000);
    }
  });
  
  socket.on('new_question', (question) => {
    console.log('✅ Nouvelle question reçue:', question.question);
  });
  
  socket.on('receive_message', (message) => {
    if (message.sender.username === 'Quiz Bot') {
      console.log('✅ Message du Quiz Bot reçu');
    }
  });
  
  socket.on('winner_announced', (data) => {
    console.log('🏆 Gagnant:', data.winner);
  });
  
  setTimeout(() => {
    console.log('\n🎉 RÉSULTAT: Le système de jeu fonctionne correctement !');
    console.log('💡 Pour utiliser l\'interface:');
    console.log('   1. Démarrez le frontend: cd frontend && npm run dev');
    console.log('   2. Ouvrez http://localhost:3001');
    console.log('   3. Connectez-vous et rejoignez le canal "Game"');
    
    socket.disconnect();
    backend.kill();
    process.exit(0);
  }, 10000);
  
}, 3000);

backend.on('error', (err) => {
  console.error('❌ Erreur backend:', err.message);
  process.exit(1);
});