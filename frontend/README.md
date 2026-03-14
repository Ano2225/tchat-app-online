# BabiChat — Frontend

Interface Next.js du projet BabiChat Online. Voir le [README principal](../README.md) pour la documentation complète.

## Démarrage rapide

```bash
npm install
npm run dev      # http://localhost:3000
```

## Commandes

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |
| `npm run lint` | Vérification ESLint |

## Variables d'environnement

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SOCKET_URL` | URL du serveur Socket.IO (défaut : `http://localhost:8000`) |
| `BACKEND_URL` | URL du backend pour le proxy Next.js (défaut : `http://localhost:8000`) |
