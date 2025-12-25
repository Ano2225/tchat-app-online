# 🐳 BabiChat - Docker Setup Guide

## 📋 Prérequis

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB espace disque

## 🚀 Démarrage Rapide

### 1. Configuration des variables d'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer le fichier .env avec vos valeurs
nano .env
```

**Variables OBLIGATOIRES à configurer:**
- `JWT_SECRET` - Générer avec: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `MONGO_ROOT_PASSWORD` - Mot de passe MongoDB
- `REDIS_PASSWORD` - Mot de passe Redis
- `ADMIN_PASSWORD` - Mot de passe admin
- `CLOUDINARY_*` - Credentials Cloudinary

### 2. Lancer l'application

```bash
# Mode développement (sans Nginx)
docker-compose up -d

# Mode production (avec Nginx)
docker-compose --profile production up -d
```

### 3. Vérifier le statut

```bash
# Voir les logs
docker-compose logs -f

# Vérifier les conteneurs
docker-compose ps

# Health check
curl http://localhost:8000/health
```

## 📦 Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js application |
| Backend | 8000 | Node.js API + Socket.IO |
| MongoDB | 27017 | Base de données |
| Redis | 6379 | Cache & Sessions |
| Nginx | 80/443 | Reverse proxy (production) |

## 🔧 Commandes Utiles

### Gestion des conteneurs

```bash
# Démarrer
docker-compose up -d

# Arrêter
docker-compose down

# Redémarrer un service
docker-compose restart backend

# Voir les logs d'un service
docker-compose logs -f backend

# Accéder au shell d'un conteneur
docker-compose exec backend sh
```

### Base de données

```bash
# Backup MongoDB
docker-compose exec mongo mongodump --out /data/backup

# Restore MongoDB
docker-compose exec mongo mongorestore /data/backup

# Accéder au shell MongoDB
docker-compose exec mongo mongosh -u admin -p changeme
```

### Nettoyage

```bash
# Supprimer les conteneurs et volumes
docker-compose down -v

# Nettoyer les images inutilisées
docker system prune -a
```

## 🔐 Sécurité

### Générer des secrets forts

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Mots de passe
openssl rand -base64 32
```

### SSL/TLS (Production)

1. Obtenir un certificat (Let's Encrypt recommandé)
2. Placer les fichiers dans `nginx/ssl/`
3. Mettre à jour `nginx/nginx.conf` avec votre domaine

```bash
# Avec Certbot
certbot certonly --standalone -d your-domain.com
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
```

## 📊 Monitoring

### Logs

```bash
# Tous les services
docker-compose logs -f

# Service spécifique
docker-compose logs -f backend

# Dernières 100 lignes
docker-compose logs --tail=100 backend
```

### Métriques

```bash
# Stats des conteneurs
docker stats

# Utilisation disque
docker system df
```

## 🐛 Dépannage

### Le backend ne démarre pas

```bash
# Vérifier les logs
docker-compose logs backend

# Vérifier la connexion MongoDB
docker-compose exec backend node -e "require('./config/database')()"
```

### Problèmes de connexion Socket.IO

1. Vérifier que le port 8000 est accessible
2. Vérifier les CORS dans `backend/server.js`
3. Vérifier les logs: `docker-compose logs -f backend`

### MongoDB connection refused

```bash
# Vérifier que MongoDB est démarré
docker-compose ps mongo

# Redémarrer MongoDB
docker-compose restart mongo

# Vérifier les logs
docker-compose logs mongo
```

## 🔄 Mise à jour

```bash
# Pull les dernières images
docker-compose pull

# Rebuild et redémarrer
docker-compose up -d --build

# Nettoyer les anciennes images
docker image prune
```

## 📈 Performance

### Optimisations recommandées

1. **Limiter les ressources**
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

2. **Utiliser des volumes nommés** (déjà configuré)

3. **Activer le cache Docker**
```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

## 🌐 Déploiement Production

### Checklist

- [ ] Variables d'environnement configurées
- [ ] Secrets forts générés
- [ ] SSL/TLS configuré
- [ ] Firewall configuré (ports 80, 443)
- [ ] Backups automatiques configurés
- [ ] Monitoring configuré
- [ ] Logs centralisés
- [ ] Rate limiting activé

### Commande de déploiement

```bash
# Build et démarrer en production
docker-compose --profile production up -d --build

# Vérifier
docker-compose ps
curl https://your-domain.com/health
```

## 📞 Support

En cas de problème:
1. Vérifier les logs: `docker-compose logs`
2. Vérifier la documentation Docker
3. Ouvrir une issue sur GitHub

