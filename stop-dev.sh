#!/bin/bash

echo "🛑 Arrêt de TChat Online..."

# Arrêter les processus
pkill -f "node backend/server.js" 2>/dev/null && echo "✅ Backend arrêté"
pkill -f "next dev" 2>/dev/null && echo "✅ Frontend arrêté"

echo "🧹 Nettoyage terminé"