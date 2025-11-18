#!/bin/bash

echo "🤖 Configuration automatique de Vertex AI"
echo "=========================================="

# Vérifier si gcloud est installé
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI n'est pas installé"
    echo "📥 Installez-le depuis: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Demander l'ID du projet
read -p "📝 Entrez votre ID de projet Google Cloud: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "❌ ID de projet requis"
    exit 1
fi

echo "🔧 Configuration du projet: $PROJECT_ID"

# Définir le projet par défaut
gcloud config set project $PROJECT_ID

# Activer les APIs nécessaires
echo "🚀 Activation de l'API Vertex AI..."
gcloud services enable aiplatform.googleapis.com

# Créer un compte de service
echo "👤 Création du compte de service..."
gcloud iam service-accounts create vertex-ai-chat \
    --display-name="Vertex AI Chat Service" \
    --description="Service account for chat AI agents"

# Ajouter les permissions
echo "🔐 Attribution des permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:vertex-ai-chat@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# Créer et télécharger la clé
echo "🔑 Génération de la clé de service..."
gcloud iam service-accounts keys create ./backend/vertex-ai-key.json \
    --iam-account=vertex-ai-chat@$PROJECT_ID.iam.gserviceaccount.com

# Mettre à jour le fichier .env
echo "📝 Mise à jour du fichier .env..."
sed -i.bak "s/GOOGLE_CLOUD_PROJECT_ID=.*/GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID/" .env
sed -i.bak "s|GOOGLE_APPLICATION_CREDENTIALS=.*|GOOGLE_APPLICATION_CREDENTIALS=./vertex-ai-key.json|" .env

echo "✅ Configuration terminée !"
echo ""
echo "🎉 Vertex AI est maintenant configuré avec:"
echo "   - Projet: $PROJECT_ID"
echo "   - Modèle: gemini-1.5-flash"
echo "   - Crédits gratuits: 300$"
echo ""
echo "🚀 Redémarrez le serveur backend:"
echo "   cd backend && npm run dev"
echo ""
echo "💡 Surveillez l'utilisation sur: https://console.cloud.google.com/vertex-ai"