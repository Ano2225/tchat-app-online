# 🤖 Configuration Google Cloud Vertex AI (GRATUIT)

## 🎁 Avantages de Vertex AI
- **300$ de crédits gratuits** pour nouveaux comptes Google Cloud
- **Gemini 1.5 Flash** : Modèle rapide et performant
- **Pas de carte bancaire** requise pour commencer
- **Meilleur rapport qualité/prix** que OpenAI

## 📋 Étapes de configuration

### 1. Créer un projet Google Cloud
1. Allez sur [console.cloud.google.com](https://console.cloud.google.com)
2. Créez un nouveau projet ou sélectionnez un existant
3. Notez l'ID du projet (ex: `mon-chat-app-123456`)

### 2. Activer l'API Vertex AI
```bash
# Dans Google Cloud Shell ou avec gcloud CLI
gcloud services enable aiplatform.googleapis.com
```

### 3. Créer une clé de service
1. Allez dans "IAM et administration" > "Comptes de service"
2. Créez un nouveau compte de service
3. Ajoutez le rôle "Vertex AI User"
4. Créez une clé JSON et téléchargez-la
5. Placez le fichier dans votre projet : `backend/vertex-ai-key.json`

### 4. Configurer les variables d'environnement
Dans le fichier `.env` :
```env
# Google Cloud Vertex AI (Free Credits)
GOOGLE_CLOUD_PROJECT_ID=mon-chat-app-123456
GOOGLE_APPLICATION_CREDENTIALS=./vertex-ai-key.json
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_MODEL=gemini-1.5-flash
```

### 5. Redémarrer le serveur
```bash
cd backend
npm run dev
```

## 🚀 Modèles disponibles

### Gemini 1.5 Flash (Recommandé)
- **Rapide** et **économique**
- Parfait pour les conversations
- **Gratuit** avec les crédits

### Gemini 1.5 Pro
- Plus puissant mais plus cher
- Pour des tâches complexes

## 💰 Coûts (après crédits gratuits)
- **Gemini 1.5 Flash** : ~$0.075 pour 1M tokens
- **10x moins cher** qu'OpenAI GPT-4
- Une conversation = quelques centimes

## 🔧 Configuration alternative (sans clé de service)
Si vous préférez utiliser l'authentification par défaut :
```bash
# Installer gcloud CLI
gcloud auth application-default login
```

Puis dans `.env` :
```env
GOOGLE_CLOUD_PROJECT_ID=mon-chat-app-123456
# Pas besoin de GOOGLE_APPLICATION_CREDENTIALS
```

## 🎯 Test rapide
1. Configurez les variables d'environnement
2. Redémarrez le serveur backend
3. Ouvrez le chat et parlez à Alex ou Emma
4. Vérifiez les logs : "Vertex AI initialized successfully"

## 🆘 Dépannage
- **Erreur d'authentification** : Vérifiez le chemin vers la clé JSON
- **Quota dépassé** : Vérifiez vos crédits dans la console Google Cloud
- **Région non supportée** : Changez `VERTEX_AI_LOCATION` vers `us-central1`

## 📊 Monitoring
Surveillez l'utilisation dans la console Google Cloud :
- "Vertex AI" > "Modèles" > "Utilisation"
- Configurez des alertes de budget