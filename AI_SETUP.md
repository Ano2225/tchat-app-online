# 🤖 Configuration de l'IA Conversationnelle

## 📋 Étapes pour activer l'IA réelle

### 1. Obtenir une clé API OpenAI
1. Allez sur [platform.openai.com](https://platform.openai.com)
2. Créez un compte ou connectez-vous
3. Allez dans "API Keys"
4. Créez une nouvelle clé secrète
5. Copiez la clé (elle commence par `sk-proj-...`)

### 2. Configurer la clé dans votre projet
Remplacez dans le fichier `.env` :
```env
OPENAI_API_KEY=sk-proj-your-real-openai-key-here
```

Par votre vraie clé :
```env
OPENAI_API_KEY=sk-proj-VOTRE_VRAIE_CLE_ICI
```

### 3. Redémarrer les serveurs
```bash
# Backend
cd backend
npm run dev

# Frontend  
cd frontend
npm run dev
```

## 🎭 Agents IA disponibles

### Alex 😎 - Ton pote cool
- **Personnalité** : Décontracté, fun, comme un vrai pote
- **Spécialités** : Gaming, films, musique, conseils de vie
- **Style** : Langage naturel, blagues, expressions françaises

### Emma 🌸 - Ta copine bienveillante  
- **Personnalité** : Empathique, créative, à l'écoute
- **Spécialités** : Art, relations, bien-être, créativité
- **Style** : Chaleureux, questions pour mieux comprendre

## 💡 Fonctionnalités

- **Conversations naturelles** comme avec de vrais amis
- **Mémoire contextuelle** des conversations précédentes
- **Réponses adaptées** selon la personnalité de chaque agent
- **Fallback intelligent** si l'API n'est pas disponible
- **Suggestions de conversation** pour démarrer facilement
- **Réactions rapides** pour répondre vite

## 🔧 Test sans API
Si vous n'avez pas encore de clé API, les agents utilisent des réponses prédéfinies intelligentes qui simulent déjà bien une conversation naturelle !

## 💰 Coûts OpenAI
- GPT-3.5-turbo : ~$0.002 pour 1000 tokens
- Une conversation normale coûte quelques centimes
- Configurez des limites dans votre compte OpenAI