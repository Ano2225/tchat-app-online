# 💬 BabiChat Online - Application de Chat Moderne

Une application de chat en temps réel avec une interface moderne, des fonctionnalités avancées et une sécurité renforcée.

## ✨ Fonctionnalités

### 🔐 Authentification & Sécurité
- ✅ Inscription/Connexion sécurisée
- ✅ Mode anonyme
- ✅ Rate limiting avancé
- ✅ Validation et sanitisation des données
- ✅ Protection CSRF avec Helmet
- ✅ Gestion des erreurs optimisée

### 💬 Chat & Communication
- ✅ Messages en temps réel (Socket.IO)
- ✅ Salons de discussion
- ✅ Messages privés
- ✅ Partage d'images/vidéos (Cloudinary)
- ✅ Réactions aux messages
- ✅ Réponses aux messages
- ✅ Indicateurs de frappe

### 🎨 Interface Utilisateur
- ✅ Design moderne avec Tailwind CSS
- ✅ Animations fluides (Framer Motion)
- ✅ Mode sombre/clair
- ✅ Interface responsive
- ✅ Composants réutilisables
- ✅ Gestion d'état optimisée (Zustand)

### ⚡ Performance & Optimisation
- ✅ Lazy loading des composants
- ✅ Optimisation des re-renders
- ✅ Gestion mémoire des messages
- ✅ Reconnexion automatique Socket.IO
- ✅ Error Boundaries React

## 🛠️ Technologies

### Frontend
- **Next.js 15** - Framework React
- **TypeScript** - Typage statique
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Socket.IO Client** - WebSocket
- **Zustand** - Gestion d'état
- **Axios** - Requêtes HTTP

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **Socket.IO** - WebSocket temps réel
- **MongoDB** - Base de données
- **Mongoose** - ODM MongoDB
- **JWT** - Authentification
- **Cloudinary** - Stockage média
- **Helmet** - Sécurité HTTP

## 🚀 Installation Rapide

### Prérequis
- Node.js (v18+)
- MongoDB
- Compte Cloudinary (optionnel)

### Installation Automatique
```bash
# Cloner le projet
git clone <votre-repo>
cd babichat-app-online

# Lancer le script de configuration
./setup.sh
```

### Installation Manuelle

1. **Backend**
```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp backend/.env.example .env
# Éditer .env avec vos configurations

# Démarrer le serveur
npm run dev
```

2. **Frontend**
```bash
cd frontend

# Installer les dépendances
npm install

# Démarrer l'application
npm run dev
```

## ⚙️ Configuration

### Variables d'environnement Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/babichat_online
JWT_SECRET=your_super_secret_jwt_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=8000
FRONTEND_URL=http://localhost:3000
```

### Variables d'environnement Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
BACKEND_URL=http://localhost:8000
```

## 🔧 Scripts Disponibles

### Backend
```bash
npm start          # Production
npm run dev        # Développement avec nodemon
```

### Frontend
```bash
npm run dev        # Développement
npm run build      # Build production
npm run start      # Serveur production
npm run lint       # Linting
```

## 📁 Structure du Projet

```
babichat-app-online/
├── backend/
│   ├── config/         # Configuration DB
│   ├── controllers/    # Logique métier
│   ├── middleware/     # Middlewares (auth, validation, rate limiting)
│   ├── models/         # Modèles MongoDB
│   ├── routes/         # Routes API
│   ├── socket/         # Gestion Socket.IO
│   └── server.js       # Point d'entrée
├── frontend/
│   ├── src/
│   │   ├── app/        # Pages Next.js
│   │   ├── components/ # Composants React
│   │   ├── hooks/      # Hooks personnalisés
│   │   ├── lib/        # Utilitaires
│   │   ├── services/   # Services API
│   │   ├── store/      # Gestion d'état
│   │   └── utils/      # Fonctions utilitaires
│   └── public/         # Assets statiques
└── README.md
```

## 🔒 Sécurité

### Mesures Implémentées
- **Rate Limiting** : Protection contre le spam
- **Validation des données** : Sanitisation des entrées
- **Helmet.js** : Headers de sécurité HTTP
- **CORS configuré** : Origine contrôlée
- **JWT sécurisé** : Authentification robuste
- **Validation MongoDB** : Protection injection NoSQL

### Bonnes Pratiques
- Mots de passe hashés (bcrypt)
- Variables d'environnement pour les secrets
- Validation côté client et serveur
- Gestion d'erreurs sans exposition de données sensibles

## 🚀 Déploiement

### Préparation
1. Configurer les variables d'environnement de production
2. Build du frontend : `npm run build`
3. Optimiser les images et assets
4. Configurer MongoDB Atlas (production)
5. Configurer Cloudinary

### Plateformes Recommandées
- **Frontend** : Vercel, Netlify
- **Backend** : Railway, Render, DigitalOcean
- **Base de données** : MongoDB Atlas
- **CDN** : Cloudinary

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

Pour toute question ou problème :
1. Vérifiez les [Issues existantes](../../issues)
2. Créez une nouvelle issue si nécessaire
3. Consultez la documentation des dépendances

---

**Développé avec ❤️ par l'équipe BabiChat**