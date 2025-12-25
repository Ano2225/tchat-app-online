# 🚨 Guide de Gestion des Erreurs - Frontend BabiChat

## 📋 Vue d'ensemble

Ce guide décrit le système complet de gestion des erreurs implémenté dans le frontend de BabiChat.

## 🛠️ Composants Créés

### 1. **Error Handler Utility** (`utils/errorHandler.ts`)

Utilitaire centralisé pour la gestion des erreurs avec :
- Extraction d'informations d'erreur depuis différentes sources (Axios, Error, string)
- Messages d'erreur user-friendly
- Mapping des codes d'erreur
- Détection des erreurs d'authentification et de rate limiting

**Utilisation:**
```typescript
import { handleError, getUserFriendlyMessage, isAuthError } from '@/utils/errorHandler'

try {
  await someAsyncOperation()
} catch (error) {
  handleError(error) // Affiche automatiquement un toast
}
```

### 2. **ErrorAlert Component** (`components/ui/ErrorAlert.tsx`)

Composant d'alerte d'erreur avec :
- 4 niveaux de sévérité (error, warning, info, success)
- Animation d'entrée/sortie
- Bouton de fermeture
- Bouton de retry optionnel
- Auto-close optionnel

**Utilisation:**
```tsx
<ErrorAlert
  message="Une erreur s'est produite"
  severity="error"
  title="Erreur de connexion"
  onClose={() => setError(null)}
  onRetry={handleRetry}
/>
```

### 3. **FormField Component** (`components/ui/FormField.tsx`)

Champ de formulaire avec validation intégrée :
- Affichage des erreurs de validation
- Icônes personnalisables
- Helper text
- États disabled/required
- Accessibilité (ARIA)

**Utilisation:**
```tsx
<FormField
  label="Email"
  name="email"
  type="email"
  value={formData.email}
  onChange={handleChange}
  error={fieldErrors.email}
  icon={<Mail className="w-4 h-4" />}
  required
/>
```

### 4. **Axios Interceptor** (`utils/axiosInterceptor.ts`)

Intercepteur Axios pour :
- Ajout automatique du token d'authentification
- Refresh automatique des tokens expirés
- Gestion de la file d'attente des requêtes pendant le refresh
- Déconnexion automatique si refresh échoue

**Configuration:**
```typescript
import axiosInstance from '@/utils/axiosInterceptor'

// Utiliser axiosInstance au lieu d'axios
const response = await axiosInstance.get('/users')
```

### 5. **Enhanced useLoadingState Hook**

Hook amélioré avec :
- Gestion du loading state
- Extraction automatique des erreurs
- Informations détaillées sur l'erreur (code, message, statusCode)
- Fonction reset

**Utilisation:**
```typescript
const { loading, error, errorInfo, withLoading, reset } = useLoadingState()

const handleSubmit = async () => {
  const result = await withLoading(async () => {
    return await api.login(credentials)
  })
  
  if (result) {
    // Success
  }
}
```

## 📝 Types d'Erreurs Gérées

### Erreurs d'Authentification
- `INVALID_CREDENTIALS` - Identifiants incorrects
- `USER_NOT_FOUND` - Utilisateur introuvable
- `USER_BLOCKED` - Compte bloqué
- `TOKEN_EXPIRED` - Session expirée
- `REFRESH_TOKEN_REUSED` - Détection d'attaque

### Erreurs de Validation
- `VALIDATION_ERROR` - Erreur de validation générale
- `INVALID_EMAIL` - Email invalide
- `INVALID_PASSWORD` - Mot de passe invalide
- `PASSWORDS_DO_NOT_MATCH` - Mots de passe différents
- `INVALID_AGE` - Âge hors limites

### Erreurs de Sécurité
- `TOO_MANY_REQUESTS` - Rate limit dépassé
- `BRUTE_FORCE_DETECTED` - Tentatives multiples détectées
- `CSRF_INVALID` - Token CSRF invalide

### Erreurs Réseau
- `NETWORK_ERROR` - Problème de connexion
- `TIMEOUT_ERROR` - Timeout
- `SERVER_ERROR` - Erreur serveur 500
- `SERVICE_UNAVAILABLE` - Service indisponible

## 🎯 Exemples d'Utilisation

### Exemple 1: Login avec Gestion d'Erreurs Complète

```typescript
const LoginPage = () => {
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const { loading, error, errorInfo, withLoading, reset } = useLoadingState()

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.username.trim()) {
      errors.username = 'Le nom d\'utilisateur est requis'
    }
    
    if (!formData.password.trim()) {
      errors.password = 'Le mot de passe est requis'
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    const result = await withLoading(async () => {
      try {
        const response = await axios.post('/api/auth/login', formData)
        return response.data
      } catch (err) {
        handleError(err)
        throw err
      }
    })

    if (result) {
      // Success - redirect
      router.push('/chat')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <ErrorAlert
          message={error}
          severity={isRateLimitError(errorInfo) ? 'warning' : 'error'}
          onClose={reset}
          onRetry={handleRetry}
        />
      )}
      
      <FormField
        label="Username"
        name="username"
        value={formData.username}
        onChange={handleChange}
        error={fieldErrors.username}
        required
      />
      
      <LoadingButton loading={loading}>
        Se connecter
      </LoadingButton>
    </form>
  )
}
```

### Exemple 2: Gestion d'Erreur API Simple

```typescript
const fetchData = async () => {
  try {
    const response = await axiosInstance.get('/api/data')
    setData(response.data)
  } catch (error) {
    handleError(error, 'Impossible de charger les données')
  }
}
```

### Exemple 3: Validation de Formulaire

```typescript
const validateEmail = (email: string): string | undefined => {
  if (!email.trim()) {
    return 'L\'email est requis'
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return 'Email invalide'
  }
  
  return undefined
}

const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value
  setEmail(value)
  
  const error = validateEmail(value)
  setFieldErrors(prev => ({
    ...prev,
    email: error
  }))
}
```

## 🎨 Personnalisation des Messages

Pour ajouter de nouveaux messages d'erreur, modifiez `ERROR_MESSAGES` dans `utils/errorHandler.ts`:

```typescript
const ERROR_MESSAGES: Record<string, string> = {
  'MY_CUSTOM_ERROR': 'Message personnalisé pour l\'utilisateur',
  // ...
}
```

## 🔄 Flux de Gestion des Erreurs

```
┌─────────────────┐
│  User Action    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Request    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Axios Instance  │────▶│ Add Auth Token   │
└────────┬────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐
│  Server         │
└────────┬────────┘
         │
         ▼
    ┌────┴────┐
    │ Success │ Error
    │         │
    ▼         ▼
┌────────┐ ┌──────────────────┐
│ Return │ │ Error Interceptor│
│ Data   │ └────────┬─────────┘
└────────┘          │
                    ▼
              ┌─────┴──────┐
              │ 401 Error? │
              └─────┬──────┘
                    │
         ┌──────────┴──────────┐
         │ Yes                 │ No
         ▼                     ▼
┌─────────────────┐    ┌──────────────┐
│ Refresh Token   │    │ Extract Error│
└────────┬────────┘    └──────┬───────┘
         │                    │
    ┌────┴────┐               │
    │ Success │ Fail          │
    │         │               │
    ▼         ▼               ▼
┌────────┐ ┌────────┐  ┌─────────────┐
│ Retry  │ │ Logout │  │ Show Error  │
│Request │ │        │  │ to User     │
└────────┘ └────────┘  └─────────────┘
```

## 📚 Ressources

- [Axios Documentation](https://axios-http.com/)
- [React Hook Form](https://react-hook-form.com/) (alternative pour validation)
- [Zod](https://zod.dev/) (alternative pour validation de schéma)

