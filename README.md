# 💬 BabiChat Online

Application de chat en temps réel avec interface moderne et fonctionnalités avancées.

## ✨ Fonctionnalités

- 💬 Messages en temps réel
- 🔐 Authentification sécurisée
- 🎮 Jeux intégrés (Quiz)
- 📱 Interface responsive
- 🌙 Mode sombre/clair
- 📸 Partage d'images/vidéos
- 🏠 Salons de discussion

## 🛠️ Technologies

**Frontend:** Next.js, TypeScript, Tailwind CSS, Socket.IO  
**Backend:** Node.js, Express, MongoDB, JWT

## 🚀 Installation

### Prérequis
- Node.js (v18+)
- MongoDB

### Démarrage rapide
```bash
# Backend
npm install
cp .env.example .env  # Configurer les variables
npm run dev

# Frontend (nouveau terminal)
cd frontend
npm install
npm run dev
```

## ⚙️ Configuration

**Backend (.env):**
```env
MONGODB_URI=mongodb://localhost:27017/babichat_online
JWT_SECRET=your_jwt_secret
PORT=8000
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
```

## 📁 Structure

```
babichat-app-online/
├── backend/     # API Node.js + Socket.IO
└── frontend/    # Interface Next.js
```

## 🚀 Déploiement

- **Frontend:** Vercel, Netlify
- **Backend:** Railway, Render
- **Base de données:** MongoDB Atlas

---

**Développé avec ❤️**