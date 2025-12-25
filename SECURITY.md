# 🔐 BabiChat - Guide de Sécurité

## 📋 Vue d'ensemble

Ce document décrit les mesures de sécurité implémentées dans BabiChat et les meilleures pratiques à suivre.

## 🛡️ Fonctionnalités de Sécurité Implémentées

### 1. Authentification & Autorisation

#### JWT avec Refresh Tokens
- **Access Tokens**: Courte durée (15 minutes)
- **Refresh Tokens**: Longue durée (7 jours)
- **Token Rotation**: Nouveau refresh token à chaque utilisation
- **Family Tracking**: Détection de réutilisation de tokens
- **Révocation**: Possibilité de révoquer tous les tokens d'un utilisateur

#### Protection des Mots de Passe
- **Hashing**: bcrypt avec salt (10 rounds)
- **Validation**: Complexité minimale requise
- **Reset sécurisé**: Tokens temporaires pour reset

### 2. Protection contre les Attaques

#### Brute Force Protection
- **Limite**: 5 tentatives par IP/username
- **Blocage**: 15 minutes après dépassement
- **Stockage**: Redis pour performance
- **Endpoints protégés**: Login, Register

#### Rate Limiting
- **Global**: 100 requêtes/15min par IP
- **Auth**: 5 requêtes/minute
- **Messages**: 30 requêtes/minute
- **API**: 30 requêtes/seconde (Nginx)

#### CSRF Protection
- **Tokens CSRF**: Validation sur mutations
- **SameSite Cookies**: Strict
- **Origin Validation**: Vérification des origines

### 3. Sécurité des Communications

#### Socket.IO
- **Authentication**: JWT requis pour connexion
- **Namespace Isolation**: Séparation des canaux
- **Event Validation**: Validation de tous les événements
- **Rate Limiting**: Limite par socket

#### HTTPS/TLS
- **TLS 1.2+**: Protocoles modernes uniquement
- **HSTS**: Strict-Transport-Security header
- **Certificate Pinning**: Recommandé en production

### 4. Validation & Sanitization

#### Input Validation
- **express-validator**: Validation côté serveur
- **Sanitization**: Nettoyage des entrées utilisateur
- **Type Checking**: Validation des types
- **Length Limits**: Limites de taille

#### XSS Protection
- **Content Security Policy**: Headers CSP
- **HTML Sanitization**: DOMPurify côté client
- **Output Encoding**: Échappement automatique

### 5. Sécurité de la Base de Données

#### MongoDB
- **Authentication**: Utilisateur/mot de passe requis
- **Network Isolation**: Accessible uniquement via Docker network
- **Injection Prevention**: Parameterized queries
- **Backup**: Sauvegardes régulières recommandées

#### Redis
- **Password Protection**: Mot de passe requis
- **Network Isolation**: Accessible uniquement via Docker network
- **Persistence**: AOF activé

## 🔒 Configuration de Sécurité

### Variables d'Environnement Critiques

```bash
# OBLIGATOIRE - Générer avec crypto.randomBytes(64)
JWT_SECRET=<secret-fort-64-bytes>

# OBLIGATOIRE - Mots de passe forts
MONGO_ROOT_PASSWORD=<password-fort>
REDIS_PASSWORD=<password-fort>
ADMIN_PASSWORD=<password-fort>

# Recommandé
NODE_ENV=production
ENABLE_BRUTE_FORCE_PROTECTION=true
ENABLE_CSRF_PROTECTION=true
ENABLE_RATE_LIMITING=true
```

### Headers de Sécurité (Helmet)

```javascript
{
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}
```

## 🚨 Détection et Réponse aux Incidents

### Logging de Sécurité

Tous les événements de sécurité sont loggés:
- Tentatives de connexion échouées
- Détection de brute force
- Réutilisation de refresh tokens
- Violations de rate limiting
- Erreurs d'authentification

### Alertes Automatiques

Le système crée des alertes pour:
- Détection de brute force
- Réutilisation de tokens (attaque potentielle)
- Tentatives d'accès non autorisé
- Violations répétées de rate limiting

## 📊 Audit de Sécurité

### Checklist de Déploiement

- [ ] Tous les secrets sont générés aléatoirement
- [ ] `.env` n'est PAS commité dans Git
- [ ] HTTPS/TLS configuré avec certificat valide
- [ ] Firewall configuré (ports 80, 443 uniquement)
- [ ] MongoDB accessible uniquement en interne
- [ ] Redis accessible uniquement en interne
- [ ] Rate limiting activé
- [ ] Brute force protection activée
- [ ] Logs de sécurité activés
- [ ] Backups automatiques configurés
- [ ] Monitoring configuré
- [ ] Mots de passe admin changés

### Tests de Sécurité Recommandés

```bash
# Test rate limiting
ab -n 1000 -c 10 http://localhost:8000/api/auth/login

# Test brute force protection
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
done

# Test HTTPS redirect
curl -I http://your-domain.com

# Test security headers
curl -I https://your-domain.com
```

## 🔄 Maintenance de Sécurité

### Mises à Jour

```bash
# Vérifier les vulnérabilités npm
npm audit

# Corriger automatiquement
npm audit fix

# Mettre à jour les dépendances
npm update
```

### Rotation des Secrets

Recommandé tous les 90 jours:
1. Générer nouveau JWT_SECRET
2. Révoquer tous les tokens existants
3. Forcer reconnexion des utilisateurs
4. Changer mots de passe des services

## 📞 Signalement de Vulnérabilités

Si vous découvrez une vulnérabilité de sécurité:

1. **NE PAS** créer d'issue publique
2. Envoyer un email à: security@babichat.com
3. Inclure:
   - Description de la vulnérabilité
   - Steps to reproduce
   - Impact potentiel
   - Suggestions de correction

## 📚 Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Socket.IO Security](https://socket.io/docs/v4/security/)

