# 🚨 Système de Gestion des Erreurs - BabiChat

## 🎯 Vue d'ensemble

Ce système offre une gestion complète et centralisée des erreurs pour l'application BabiChat, avec:
- **39 codes d'erreur** gérés automatiquement
- **Messages user-friendly** en français
- **Refresh automatique** des tokens expirés
- **Validation de formulaires** intégrée
- **Composants UI** réutilisables

## 🚀 Démarrage Rapide

### 1. Utilisation Basique

```typescript
import { handleError } from '@/utils/errorHandler'

try {
  const response = await axios.post('/api/auth/login', credentials)
  // Success
} catch (error) {
  handleError(error) // Affiche automatiquement un toast
}
```

### 2. Avec le Hook useLoadingState

```typescript
import { useLoadingState } from '@/hooks/useLoadingState'

const { loading, error, errorInfo, withLoading, reset } = useLoadingState()

const handleSubmit = async () => {
  const result = await withLoading(async () => {
    return await authService.login(credentials)
  })
  
  if (result) {
    // Success - redirect or update UI
    router.push('/chat')
  }
  // Error is automatically handled and stored in `error` state
}
```

### 3. Affichage des Erreurs

```tsx
import ErrorAlert from '@/components/ui/ErrorAlert'

{error && (
  <ErrorAlert
    message={error}
    severity="error"
    title="Erreur de connexion"
    onClose={reset}
    onRetry={handleRetry}
  />
)}
```

### 4. Validation de Formulaires

```tsx
import FormField from '@/components/ui/FormField'

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

## 📦 Composants Disponibles

### ErrorAlert

Composant d'alerte avec 4 niveaux de sévérité:

```tsx
<ErrorAlert
  message="Message d'erreur"
  severity="error" // 'error' | 'warning' | 'info' | 'success'
  title="Titre optionnel"
  onClose={() => setError(null)}
  onRetry={handleRetry}
  dismissible={true}
  autoClose={false}
  duration={5000}
/>
```

### FormField

Champ de formulaire avec validation:

```tsx
<FormField
  label="Nom d'utilisateur"
  name="username"
  value={formData.username}
  onChange={handleChange}
  error={fieldErrors.username}
  placeholder="johndoe"
  icon={<User className="w-4 h-4" />}
  helperText="Texte d'aide"
  required
  disabled={loading}
/>
```

## 🔧 Configuration

### Axios Interceptor

L'intercepteur est automatiquement configuré. Pour l'utiliser:

```typescript
import axiosInstance from '@/utils/axiosInterceptor'

// Utiliser axiosInstance au lieu d'axios
const response = await axiosInstance.get('/api/users')
```

L'intercepteur gère automatiquement:
- ✅ Ajout du token d'authentification
- ✅ Refresh du token si expiré
- ✅ Retry de la requête après refresh
- ✅ Déconnexion si refresh échoue

### Messages d'Erreur Personnalisés

Pour ajouter un nouveau message d'erreur, éditez `src/utils/errorHandler.ts`:

```typescript
const ERROR_MESSAGES: Record<string, string> = {
  'MY_CUSTOM_ERROR': 'Message personnalisé pour l\'utilisateur',
  // ...
}
```

## 🧪 Tests

### Lancer les Tests Unitaires

```bash
npm run test src/utils/__tests__/errorHandler.test.ts
```

### Page de Démonstration

Visitez `/error-demo` pour tester interactivement tous les types d'erreurs:

```bash
npm run dev
# Ouvrir http://localhost:3000/error-demo
```

## 📚 Exemples Complets

### Exemple 1: Login avec Gestion Complète

```typescript
'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useLoadingState } from '@/hooks/useLoadingState'
import ErrorAlert from '@/components/ui/ErrorAlert'
import FormField from '@/components/ui/FormField'
import LoadingButton from '@/components/ui/LoadingButton'
import { isRateLimitError } from '@/utils/errorHandler'
import { User, Lock } from 'lucide-react'

export default function LoginPage() {
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const { loading, error, errorInfo, withLoading, reset } = useLoadingState()
  const router = useRouter()

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
      const response = await axios.post('/api/auth/login', formData)
      return response.data
    })

    if (result) {
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
        />
      )}
      
      <FormField
        label="Nom d'utilisateur"
        name="username"
        value={formData.username}
        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
        error={fieldErrors.username}
        icon={<User className="w-4 h-4" />}
        required
      />
      
      <FormField
        label="Mot de passe"
        name="password"
        type="password"
        value={formData.password}
        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
        error={fieldErrors.password}
        icon={<Lock className="w-4 h-4" />}
        required
      />
      
      <LoadingButton loading={loading} type="submit">
        Se connecter
      </LoadingButton>
    </form>
  )
}
```

## 🎨 Personnalisation

### Changer les Couleurs des Alertes

Éditez `src/components/ui/ErrorAlert.tsx`:

```typescript
const config = {
  error: {
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    // ...
  }
}
```

### Ajouter une Nouvelle Sévérité

1. Ajouter le type dans `ErrorSeverity`
2. Ajouter la configuration dans `config`
3. Utiliser la nouvelle sévérité

## 📖 Documentation Complète

- [Guide Complet](./ERROR_HANDLING_GUIDE.md) - Guide détaillé avec tous les exemples
- [Implémentation](./ERROR_HANDLING_IMPLEMENTATION.md) - Détails de l'implémentation

## 🐛 Dépannage

### Les erreurs ne s'affichent pas

Vérifiez que:
1. `react-hot-toast` est installé
2. Le `Toaster` est présent dans le layout
3. L'erreur est bien catchée

### Le refresh token ne fonctionne pas

Vérifiez que:
1. Le backend retourne bien `refreshToken`
2. Le token est stocké dans localStorage
3. L'endpoint `/token/refresh` existe

### Les validations ne fonctionnent pas

Vérifiez que:
1. Les erreurs sont bien dans `fieldErrors`
2. Le nom du champ correspond
3. La fonction de validation est appelée

## 🤝 Contribution

Pour contribuer:
1. Ajouter de nouveaux codes d'erreur dans `errorHandler.ts`
2. Créer des tests pour les nouveaux cas
3. Mettre à jour la documentation

## 📝 Licence

MIT

