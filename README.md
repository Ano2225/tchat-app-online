# BabiChat Online

Application de chat en temps réel — salons publics, messagerie privée, quiz multijoueur, mentions `@username`.

---

## Stack

| Couche | Technologies |
|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand |
| **Backend** | Node.js, Express, Socket.IO 4 |
| **Base de données** | MongoDB via Mongoose 8 |
| **Auth** | better-auth (email/password + anonyme) |
| **Upload** | Cloudinary |
| **IA** | Groq (`llama-3.1-8b-instant`) — UI masquée MVP |
| **Infrastructure** | Docker Compose (MongoDB, Redis, Umami) |

---

## Fonctionnalités

- **Chat temps réel** — salons publics, réponses, réactions emoji, historique paginé
- **@mentions** — dropdown de complétion dans l'input, highlight dans les bulles, banner de notification centré
- **Messagerie privée** — 1-to-1, indicateurs de lecture, compteur non-lus, blocage
- **Quiz multijoueur** (salon Game) — questions depuis Open Trivia DB, traduction FR (DeepL ou MyMemory), 15s/question, classement en direct avec animations de rang
- **Présence** — liste des users en ligne par salon, indicateur vert/gris temps réel
- **Admin** — gestion utilisateurs, modération, signalements, analytics (Recharts + Umami)
- **Auth** — inscription, connexion, mode anonyme, protection CSRF, rate limiting

---

## Démarrage rapide

**Prérequis** : Node.js 20+, Docker

```bash
# 1. Variables d'environnement
cp .env.example .env
# Remplir au minimum : MONGODB_URI, BETTER_AUTH_SECRET, CSRF_SECRET, FRONTEND_URL

# 2. Infrastructure
cd infra && docker compose up -d

# 3. Backend (port 8000)
cd ..
npm install && npm run dev

# 4. Frontend (port 3000)
cd frontend && npm install && npm run dev

# Première fois seulement
cd ..
npm run init-admin      # compte admin (variables ADMIN_*)
```

Les salons publics par défaut (`General`, `Music`, `Sport`) sont créés automatiquement au démarrage du backend.

---

## Variables d'environnement essentielles

| Variable | Description |
|---|---|
| `MONGODB_URI` | URI MongoDB |
| `BETTER_AUTH_SECRET` | Secret better-auth |
| `FRONTEND_URL` | Origine CORS (ex: `http://localhost:3000`) |
| `CSRF_SECRET` | Secret CSRF |
| `CLOUDINARY_*` | Credentials Cloudinary (uploads) |
| `GROQ_API_KEY` | Clé Groq (quiz + agents IA) |
| `DEEPL_API_KEY` | Traduction quiz FR — optionnel, fallback MyMemory |
| `NEXT_PUBLIC_UMAMI_*` | Analytics frontend — optionnel |

Voir `.env.example` pour la liste complète.

---

## Auteur

Arouna Ouattara
