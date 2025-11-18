# Composants Skeleton - Guide d'utilisation

Les composants skeleton améliorent l'UX en affichant des placeholders pendant le chargement des données.

## Composants disponibles

### 1. ChatSkeleton
Pour les messages de chat
```tsx
import { ChatSkeleton } from '@/components/ui/skeletons'

<ChatSkeleton count={5} />
```

### 2. UserListSkeleton
Pour les listes d'utilisateurs
```tsx
import { UserListSkeleton } from '@/components/ui/skeletons'

<UserListSkeleton count={3} />
```

### 3. ChannelListSkeleton
Pour les listes de canaux
```tsx
import { ChannelListSkeleton } from '@/components/ui/skeletons'

<ChannelListSkeleton count={4} />
```

### 4. ProfileSkeleton
Pour les profils utilisateur
```tsx
import { ProfileSkeleton } from '@/components/ui/skeletons'

<ProfileSkeleton />
```

### 5. AuthFormSkeleton
Pour les formulaires d'authentification
```tsx
import { AuthFormSkeleton } from '@/components/ui/skeletons'

<AuthFormSkeleton />
```

### 6. ModalSkeleton
Pour les modales
```tsx
import { ModalSkeleton } from '@/components/ui/skeletons'

<ModalSkeleton showHeader={true} showFooter={true} />
```

## Utilisation avec LoadingWrapper

```tsx
import LoadingWrapper from '@/components/ui/LoadingWrapper'
import { ChatSkeleton } from '@/components/ui/skeletons'

<LoadingWrapper
  loading={loading}
  error={error}
  skeleton={<ChatSkeleton count={3} />}
  onRetry={handleRetry}
>
  {/* Votre contenu */}
</LoadingWrapper>
```

## Hook useLoadingState

```tsx
import { useLoadingState } from '@/hooks/useLoadingState'

const { loading, error, withLoading } = useLoadingState()

const handleAction = async () => {
  const result = await withLoading(async () => {
    // Votre action async
    return await fetchData()
  })
  
  if (result) {
    // Succès
  }
}
```

## Composants utilitaires

### LoadingButton
Bouton avec état de chargement intégré
```tsx
import LoadingButton from '@/components/ui/LoadingButton'

<LoadingButton
  loading={loading}
  loadingText="Envoi..."
  variant="primary"
  size="md"
>
  Envoyer
</LoadingButton>
```

### FeedbackSpinner
Spinner personnalisable
```tsx
import FeedbackSpinner from '@/components/ui/FeedbackSpinner'

<FeedbackSpinner size="md" color="primary" />
```

## Bonnes pratiques

1. **Utilisez toujours des skeletons** pour les chargements > 200ms
2. **Adaptez le nombre d'éléments** skeleton à votre contenu
3. **Combinez avec des animations** pour une meilleure UX
4. **Gérez les erreurs** avec LoadingWrapper
5. **Utilisez useLoadingState** pour centraliser la gestion des états