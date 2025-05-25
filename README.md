# 💬 Tchat_Online

Tchat_Online est une application de chat en temps réel qui vous permet d'échanger des messages dans les **canaux de discussions**, en **privé**, et de partager des **images et des vidéos**.

---

## ✨ Fonctionnalités Clés

* **Chat en temps réel :** Conversations instantanées entre utilisateurs.
* **Canaux de discussion :** Participez à des discussions de groupe.
* **Messages privés :** Échangez en tête-à-tête avec d'autres utilisateurs.
* **Partage de médias :** Envoyez des photos et des vidéos directement dans le chat.
* **Statut en ligne :** Voyez qui est disponible pour discuter.
* **Historique des messages :** Retrouvez vos anciennes discussions facilement.

---

## 🛠️ Technologies

* **Frontend :** Next.js, React, Tailwind CSS, Axios, Socket.IO Client, Zustand.
* **Backend :** Node.js, Express.js, Socket.IO, MongoDB, Mongoose.
* **Stockage des médias :** Cloudinary.

---

## 🚀 Comment l'utiliser (Localement)

### 1. Prérequis

Assurez-vous d'avoir :
* **Node.js** (v18 ou plus recommandé)
* **npm** ou **Yarn**
* Une instance **MongoDB** (locale ou Cloud Atlas)
* Un compte **Cloudinary**

### 2. Démarrage du Backend

* Allez dans le dossier de votre backend (ex: `cd backend`).
* Installez les dépendances : `npm install`
* Créez un fichier `.env` à la racine du dossier backend et ajoutez vos variables d'environnement (port, connexion MongoDB, secret JWT, clés Cloudinary).
* Lancez le serveur : `npm start` (ou votre commande de démarrage).

### 3. Démarrage du Frontend

* Allez dans le dossier de votre frontend (ex: `cd frontend` ou à la racine de votre projet).
* Installez les dépendances : `npm install`
* Lancez l'application Next.js : `npm run dev`

L'application sera accessible sur `http://localhost:3000`.

---

## ⚙️ Configuration Importante pour le Développement

* **`next.config.js` :** Vérifiez que le domaine de Cloudinary (`res.cloudinary.com`) est bien ajouté dans la section `images.domains` pour que les images s'affichent. Assurez-vous également que la règle de `rewrites` pour `/api` est configurée pour proxyfier vers votre backend.
* **`src/utils/axiosInstance.js` :** Assurez-vous que la `baseURL` est bien définie sur `/api` pour une bonne communication entre le frontend Next.js et le backend.

---

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir des problèmes (issues) ou à soumettre des requêtes de fusion (pull requests).
