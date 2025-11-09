#!/bin/bash

echo "🚀 Démarrage de TChat Online en mode développement"
echo "=================================================="

# Vérifier si MongoDB est en cours d'exécution
if ! pgrep -x "mongod" > /dev/null; then
    echo "❌ MongoDB n'est pas en cours d'exécution"
    echo "💡 Démarrez MongoDB avec: brew services start mongodb-community"
    exit 1
fi

echo "✅ MongoDB est en cours d'exécution"

# Arrêter les processus existants
echo "🧹 Nettoyage des processus existants..."
pkill -f "node backend/server.js" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

# Démarrer le backend
echo "🔧 Démarrage du backend..."
cd backend && npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!

# Attendre que le backend soit prêt
sleep 3

# Vérifier si le backend est démarré
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend démarré sur http://localhost:8000"
else
    echo "❌ Erreur lors du démarrage du backend"
    exit 1
fi

# Démarrer le frontend
echo "🎨 Démarrage du frontend..."
cd ../frontend && npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!

# Attendre que le frontend soit prêt
sleep 5

echo ""
echo "🎉 TChat Online est prêt !"
echo "=========================="
echo "🔧 Backend: http://localhost:8000"
echo "🎨 Frontend: http://localhost:3001 (ou 3000 si disponible)"
echo "🎮 Canal Game: Rejoignez le canal 'Game' pour jouer au quiz"
echo ""
echo "📋 Commandes utiles:"
echo "- Arrêter: Ctrl+C puis ./stop-dev.sh"
echo "- Logs backend: tail -f backend.log"
echo "- Logs frontend: tail -f frontend.log"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter..."

# Attendre l'interruption
trap 'echo "🛑 Arrêt des services..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT
wait