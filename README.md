# BabiChat Online

Application de chat en temps réel full-stack avec messagerie privée, quiz multijoueur, agents IA et système de présence.

---

## Stack technique

| Couche | Technologies |
|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand |
| **Backend** | Node.js, Express, Socket.IO 4 |
| **Base de données** | MongoDB via Mongoose |
| **Auth** | better-auth (email + anonyme) |
| **Temps réel** | Socket.IO (chat, présence, jeux, messages privés) |
| **Upload** | Cloudinary via Multer |
| **IA** | Groq, Ollama, Google Vertex AI, HuggingFace (sélectable) |
| **Email (dev)** | Mailhog via Docker |
| **Infrastructure** | Docker Compose (MongoDB + Mailhog) |

---

## Fonctionnalités

### Chat
- Salons publics (General, Sport, Gaming, Musique, Game…)
- Messages en temps réel via Socket.IO
- Réponse à un message (reply)
- Réactions emoji
- Différenciation visuelle homme/femme (bleu/rose)
- Historique paginé (cursor-based, 50 messages par page)
- Upload d'images/vidéos (Cloudinary)

### Messagerie privée
- Chat 1-to-1 en temps réel
- Livraison garantie : room privée côté serveur + personal room (double delivery)
- Affichage optimiste (le message s'affiche immédiatement pour l'expéditeur)
- Indicateurs de lecture (✓ envoyé / ✓✓ lu)
- Compteur de non-lus par conversation
- Notifications toast avec avatar, nom et aperçu du message
- Badge non-lus persistant au rechargement (chargé depuis la DB)
- Panel conversations dans le header
- Blocage / déblocage d'utilisateurs

### Présence
- Liste des utilisateurs en ligne par salon
- Indicateur vert/gris en temps réel
- Événements `presence_update` broadcast sur connect/disconnect
- Debounce 250 ms sur les broadcasts pour tenir la charge

### Quiz multijoueur (salon Game)
- Questions générées par IA
- Minuteur 15 secondes par question
- Feedback instantané (bonne/mauvaise réponse + couleur)
- Révélation de la bonne réponse
- Classement en temps réel
- Accès mobile via bottom-sheet

### Agents IA
- Plusieurs personnages configurables (Alex, Emma…)
- Multi-providers : Groq, Ollama, Vertex AI, HuggingFace
- Quota journalier par utilisateur

### Authentification
- Inscription avec email, username, âge, genre, ville
- Connexion par email / mot de passe
- Mode anonyme (username temporaire, historique conservé)
- Gestion de session via better-auth (tokens JWT)
- Protection CSRF (tokens HMAC signés, TTL 1h)
- Rate limiting : 200 req/15 min global, 20 messages/min

### Administration
- Dashboard admin (gestion utilisateurs, modération)
- Signalements utilisateurs
- Recherche sécurisée (regex échappé contre injection NoSQL)

---

## Structure du projet

```
/
├── backend/
│   ├── config/          # DB, auth, better-auth
│   ├── controllers/     # messageController, adminController
│   ├── middleware/      # authBetter, csrf, security, aiQuota
│   ├── models/          # User, Message, Channel, AIAgent, AIUsage, Report, Game
│   ├── routes/          # authBetter, message, channel, user, upload, admin, reports, aiAgents
│   ├── services/        # aiService, emailService
│   ├── socket/          # socketHandlers, gameHandlers
│   └── server.js        # Point d'entrée Express + Socket.IO
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/          # login, register, anonymous, reset
│   │   │   └── (protected)/     # /chat, /admin
│   │   ├── components/
│   │   │   ├── chat/            # ChatMessage, ChatInput, ChatChannel, ChatHeader
│   │   │   │                    # PrivateChatBox, UsersOnline
│   │   │   ├── Game/            # GamePanel
│   │   │   ├── profile/         # ProfileModal
│   │   │   └── ui/              # GenderAvatar, ErrorBoundary, skeletons…
│   │   ├── hooks/               # useGame, useOptimizedSocket
│   │   ├── services/            # chatServices, reportService
│   │   ├── store/               # authStore (Zustand), gameStore
│   │   └── utils/               # axiosInstance, axiosInterceptor
├── infra/
│   └── docker-compose.yml       # MongoDB + Mailhog
├── docs/
├── package.json                 # Dépendances backend (racine)
└── .env.example
```

---

## Installation

### Prérequis

- Node.js 20+
- Docker (pour MongoDB + Mailhog en local)

### 1. Infrastructure

```bash
cd infra
docker compose up -d
# MongoDB sur :27017 | Mailhog UI sur http://localhost:8025
```

### 2. Variables d'environnement

```bash
cp .env.example .env
# Remplir au minimum :
# MONGODB_URI, BETTER_AUTH_SECRET, JWT_SECRET, FRONTEND_URL
# CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
# GROQ_API_KEY  (ou autre provider IA)
```

### 3. Backend

```bash
# Depuis la racine du projet
npm install
npm run dev          # nodemon backend/server.js — port 8000
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev          # Next.js — port 3000
```

### 5. Initialisation (première fois)

```bash
npm run init-channels   # Crée les salons par défaut
npm run init-db         # Initialise la base
npm run init-admin      # Crée le compte admin
```

---

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `MONGODB_URI` | Oui | URI de connexion MongoDB |
| `BETTER_AUTH_SECRET` | Oui | Secret better-auth |
| `JWT_SECRET` | Oui | Clé de signature JWT |
| `FRONTEND_URL` | Oui | Origine CORS (`http://localhost:3000`) |
| `CLOUDINARY_CLOUD_NAME` | Uploads | Identifiants Cloudinary |
| `CLOUDINARY_API_KEY` | Uploads | |
| `CLOUDINARY_API_SECRET` | Uploads | |
| `AI_PROVIDER` | IA | `groq` \| `ollama` \| `vertexai` \| `huggingface` |
| `GROQ_API_KEY` | IA (Groq) | Clé API Groq |
| `CSRF_SECRET` | Recommandé | Secret HMAC CSRF |
| `PORT` | Non | Port backend (défaut : 8000) |
| `NODE_ENV` | Non | `development` \| `production` |

---

## Commandes disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Backend en mode développement (nodemon) |
| `npm start` | Backend en production |
| `npm run init-channels` | Initialise les salons par défaut |
| `npm run init-db` | Initialise la base de données |
| `npm run init-admin` | Crée le compte administrateur |
| `cd frontend && npm run dev` | Frontend Next.js |
| `cd frontend && npm run build` | Build production frontend |
| `cd frontend && npm run lint` | Lint ESLint |

---

## Architecture Socket.IO

Les événements sont traités dans `backend/socket/socketHandlers.js` et `backend/socket/gameHandlers.js`.

### Événements client → serveur

| Événement | Description |
|---|---|
| `user_connected` | Enregistrement de la session |
| `update_username` | Mise à jour après login |
| `join_room` / `leave_room` | Rejoindre/quitter un salon public |
| `send_message` | Message public |
| `add_reaction` | Réaction emoji |
| `join_private_room` | Rejoindre la room privée |
| `send_private_message` | Envoyer un message privé |
| `mark_messages_read` | Marquer comme lu |
| `check_user_online` | Vérifier la présence d'un user |
| `join_game_channel` | Rejoindre le quiz |
| `submit_answer` | Répondre à une question |

### Événements serveur → client

| Événement | Description |
|---|---|
| `receive_message` | Nouveau message public |
| `receive_private_message` | Nouveau message privé (room privée) |
| `new_private_message` | Notification message privé (personal room) |
| `presence_update` | Changement de statut en ligne |
| `update_user_list` | Liste globale des connectés |
| `update_room_user_list` | Liste des users du salon courant |
| `reaction_updated` | Mise à jour des réactions |
| `messages_read` | Accusé de lecture |
| `new_question` | Nouvelle question quiz |
| `answer_result` | Résultat de réponse |
| `question_ended` | Fin de question + classement |
| `session_replaced` | Session remplacée (double connexion) |

---

## Sécurité

- Sender toujours extrait de `req.user._id` / `socket.userId` — jamais du body client
- Injection NoSQL : opérateurs `$` supprimés du body avant traitement
- Upload : validation magic bytes côté serveur (pas uniquement le MIME client)
- CSRF : tokens HMAC signés (TTL 1h, comparaison constant-time)
- Brute force : rate limiting par IP sur `/login`
- CORS : piloté par `FRONTEND_URL`, jamais hardcodé
- URLs avatar : validées `/^https?:\/\//` avant rendu
- Stack traces : masquées en production

---

## Auteur

Arouna Ouattara
