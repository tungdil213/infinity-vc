# Architecture des Composants - Infinity Project

## Règles de Séparation UI/Logique

Conformément aux règles définies dans `.windsurfrules`, le projet suit une architecture stricte de séparation entre composants UI purs et wrappers avec logique métier.

## Structure des Packages

### `packages/ui/` - Composants UI Purs ✅

**Principe**: Composants réutilisables, découplés de la logique métier, sans dépendances à Inertia/AdonisJS.

**Contenu**:
- **Primitives** (`src/components/primitives/`): Composants shadcn/ui (Button, Card, Dialog, etc.)
- **Composés** (`src/components/`): Composants métier réutilisables
  - `header.tsx` - Header avec navigation
  - `footer.tsx` - Footer du site
  - `lobby-card.tsx` - Carte d'affichage d'un lobby
  - `lobby-list.tsx` - Liste de lobbies avec filtres
  - `lobby-status-badge.tsx` - Badge de statut de lobby
  - `player-avatar.tsx` - Avatar de joueur

**Caractéristiques**:
```typescript
// ✅ BON - Composant UI pur
export function LobbyCard({ lobby, onJoin, onLeave }: Props) {
  // Pas de hooks Inertia
  // Pas de router
  // Pas de contextes métier
  // Seulement du rendu et des callbacks
  return <Card>...</Card>
}
```

**Interdictions**:
- ❌ Import de `@inertiajs/react`
- ❌ Import de contextes métier (`LobbyContext`, `TransmitContext`)
- ❌ Appels API directs
- ❌ Logique métier complexe

### `apps/infinity/inertia/components/` - Wrappers avec Logique ✅

**Principe**: Wrappers qui ajoutent la logique métier (hooks, routing, toasts) aux composants UI purs.

**Contenu**:
- **Wrappers** - Composants qui utilisent les composants UI
  - `LobbyList.tsx` - Wrapper pour `@tyfo.dev/ui/lobby-list`
  - `HeaderWrapper.tsx` - Wrapper pour `@tyfo.dev/ui/header`
  
- **Composants app-spécifiques** - Logique métier complexe
  - `AutoLeaveLobby.tsx` - Gestion automatique de sortie de lobby
  - `GameLobby.tsx` - Interface de jeu complète avec hooks
  - `LobbyStatusSidebar.tsx` - Sidebar temps réel avec contextes
  - `layout.tsx` - Layout principal avec providers
  - `toast_handler.tsx` - Gestion des flash messages Inertia

**Caractéristiques**:
```typescript
// ✅ BON - Wrapper avec logique
import { LobbyList as UILobbyList } from '@tyfo.dev/ui/lobby-list'
import { useLobbyList } from '../hooks/use_lobby_list'
import { router } from '@inertiajs/react'

export default function LobbyListWrapper({ currentUser, initialLobbies }) {
  // ✅ Hooks métier
  const { lobbies, loading, joinLobby } = useLobbyList({}, initialLobbies)
  
  // ✅ Handlers avec logique Inertia
  const handleJoin = async (lobbyUuid: string) => {
    await joinLobby(lobbyUuid, currentUser.uuid)
    router.visit(`/lobbies/${lobbyUuid}`)
    toast.success('Lobby rejoint !')
  }
  
  // ✅ Rendu du composant UI avec les handlers
  return <UILobbyList lobbies={lobbies} onJoin={handleJoin} />
}
```

## Pattern Recommandé: UI Component + Wrapper

### 1. Créer le Composant UI Pur

**Fichier**: `packages/ui/src/components/my-component.tsx`

```typescript
// ✅ Props typées avec callbacks
export interface MyComponentProps {
  data: DataType[]
  loading?: boolean
  error?: string
  onAction?: (id: string) => void
  onRefresh?: () => void
  className?: string
}

// ✅ Composant découplé de la logique métier
export function MyComponent({ 
  data, 
  loading, 
  error, 
  onAction, 
  onRefresh 
}: MyComponentProps) {
  // Seulement du rendu et des appels de callbacks
  return (
    <div>
      {loading && <Spinner />}
      {error && <ErrorMessage message={error} />}
      {data.map(item => (
        <Card key={item.id} onClick={() => onAction?.(item.id)}>
          {item.name}
        </Card>
      ))}
    </div>
  )
}
```

### 2. Créer le Wrapper avec Logique

**Fichier**: `apps/infinity/inertia/components/MyComponent.tsx`

```typescript
import { MyComponent as UIMyComponent } from '@tyfo.dev/ui/my-component'
import { useMyData } from '../hooks/use_my_data'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'

// ✅ Logging standardisé avec préfixe 🔧
console.log('🔧 MyComponentWrapper: Module loaded')

export default function MyComponentWrapper({ initialData }) {
  console.log('🔧 MyComponentWrapper: Initializing')
  
  // ✅ Hooks métier avec fallback Inertia
  const { data, loading, error, performAction } = useMyData(initialData)
  
  // ✅ Handlers avec logique métier
  const handleAction = async (id: string) => {
    console.log('🔧 MyComponentWrapper: Performing action', { id })
    try {
      await performAction(id)
      toast.success('Action réussie !')
      router.visit(`/items/${id}`)
    } catch (err) {
      console.error('🔧 MyComponentWrapper: Action failed', err)
      toast.error('Échec de l\'action')
    }
  }
  
  // ✅ Fallback gracieux
  const effectiveData = data.length > 0 ? data : initialData
  
  return (
    <UIMyComponent 
      data={effectiveData}
      loading={loading}
      error={error}
      onAction={handleAction}
    />
  )
}
```

### 3. Créer la Story Storybook

**Fichier**: `apps/docs/stories/my-component.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { MyComponent } from '@tyfo.dev/ui'
import { fn } from '@storybook/test'

const meta: Meta<typeof MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
  args: {
    onAction: fn(),
    onRefresh: fn(),
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    data: [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ],
  },
}

export const Loading: Story = {
  args: {
    data: [],
    loading: true,
  },
}

export const Error: Story = {
  args: {
    data: [],
    error: 'Failed to load data',
  },
}
```

## Checklist de Conformité

### Pour un Composant UI (`packages/ui/`)

- [ ] ✅ Aucun import de `@inertiajs/react`
- [ ] ✅ Aucun import de contextes métier
- [ ] ✅ Props typées avec TypeScript
- [ ] ✅ Callbacks pour toutes les actions
- [ ] ✅ Support du `className` pour extensibilité
- [ ] ✅ Story Storybook créée dans `apps/docs/stories/`
- [ ] ✅ Documentation dans la story avec variantes

### Pour un Wrapper (`apps/infinity/inertia/components/`)

- [ ] ✅ Import du composant UI depuis `@tyfo.dev/ui`
- [ ] ✅ Hooks métier avec fallback Inertia
- [ ] ✅ Handlers avec logique métier (routing, toasts)
- [ ] ✅ Logging standardisé avec préfixe 🔧
- [ ] ✅ Gestion d'erreurs avec try/catch + toast
- [ ] ✅ Adaptation des props si nécessaire
- [ ] ✅ Pattern: `effectiveData = realtimeData || initialData`

### Pour un Composant App-Spécifique (`apps/infinity/inertia/components/`)

Ces composants peuvent rester dans `apps/infinity` s'ils:
- [ ] ✅ Utilisent des hooks métier complexes
- [ ] ✅ Dépendent de contextes spécifiques (LobbyContext, TransmitContext)
- [ ] ✅ Contiennent une logique métier non réutilisable
- [ ] ✅ Sont trop couplés à l'architecture Inertia/AdonisJS

**Exemples valides**:
- `AutoLeaveLobby.tsx` - Gestion beforeunload + API calls
- `GameLobby.tsx` - Interface complète avec hooks multiples
- `LobbyStatusSidebar.tsx` - Sidebar avec contextes + SSE
- `layout.tsx` - Layout avec providers
- `toast_handler.tsx` - Conversion flash messages Inertia

## Avantages de cette Architecture

### 1. **Réutilisabilité** 🔄
Les composants UI peuvent être utilisés dans d'autres projets ou packages.

### 2. **Testabilité** 🧪
Les composants UI sont facilement testables sans mock de hooks/contextes.

### 3. **Documentation Vivante** 📚
Storybook documente tous les états et variantes des composants.

### 4. **Séparation des Responsabilités** 🎯
- UI = Rendu visuel
- Wrapper = Logique métier

### 5. **Évolutivité** 📈
Facile d'ajouter de nouvelles features sans casser l'UI.

### 6. **Design System Cohérent** 🎨
Tous les projets du monorepo utilisent les mêmes composants.

## Règles à Éviter ❌

### Anti-pattern 1: Logique Métier dans UI
```typescript
// ❌ MAUVAIS - Composant UI avec logique métier
export function LobbyCard({ lobbyUuid }) {
  const { lobby } = useLobbyDetails(lobbyUuid) // ❌ Hook métier
  const handleJoin = () => {
    router.visit(`/lobbies/${lobbyUuid}`) // ❌ Router Inertia
  }
  return <Card onClick={handleJoin}>...</Card>
}
```

### Anti-pattern 2: Duplication de Composants
```typescript
// ❌ MAUVAIS - Composant dupliqué dans apps/
// Ne pas créer apps/infinity/inertia/components/LobbyCard.tsx
// si packages/ui/src/components/lobby-card.tsx existe déjà
```

### Anti-pattern 3: Import Direct sans Wrapper
```typescript
// ❌ MAUVAIS - Import direct dans une page
import { LobbyList } from '@tyfo.dev/ui/lobby-list'

export default function LobbiesPage() {
  // Comment gérer les hooks ? Les handlers ?
  return <LobbyList lobbies={[]} /> // ❌ Données manquantes
}
```

## Migration d'un Composant Existant

Si un composant existe déjà dans `apps/infinity/inertia/components/` et qu'il devrait être dans `packages/ui/`:

### Étape 1: Analyser le Composant
- Contient-il de la logique métier ? → Garder dans apps/
- Est-il réutilisable ? → Migrer vers packages/ui/

### Étape 2: Extraire l'UI Pure
```typescript
// Avant (apps/infinity/inertia/components/MyComponent.tsx)
export function MyComponent() {
  const { data } = useMyHook() // Logique métier
  const handleClick = () => router.visit('/page') // Logique métier
  return <Card onClick={handleClick}>{data.name}</Card>
}

// Après (packages/ui/src/components/my-component.tsx)
export function MyComponent({ data, onClick }: Props) {
  return <Card onClick={onClick}>{data.name}</Card>
}
```

### Étape 3: Créer le Wrapper
```typescript
// apps/infinity/inertia/components/MyComponent.tsx
import { MyComponent as UIMyComponent } from '@tyfo.dev/ui/my-component'
import { useMyHook } from '../hooks/use_my_hook'
import { router } from '@inertiajs/react'

export default function MyComponentWrapper() {
  const { data } = useMyHook()
  const handleClick = () => router.visit('/page')
  return <UIMyComponent data={data} onClick={handleClick} />
}
```

### Étape 4: Créer la Story
```typescript
// apps/docs/stories/my-component.stories.tsx
import { MyComponent } from '@tyfo.dev/ui'

export default { title: 'Components/MyComponent', component: MyComponent }
export const Default = { args: { data: mockData } }
```

## Commandes Utiles

### Build du Package UI
```bash
cd packages/ui
pnpm run build
```

### Lancer Storybook
```bash
cd apps/docs
pnpm run storybook
```

### Vérifier les Exports
```bash
# Vérifier que le composant est exporté
cat packages/ui/src/index.ts | grep "my-component"
```

## Références

- `.windsurfrules` - Règles "UI Library Consistency" (ligne 617-630)
- `.windsurfrules` - Règles "Storybook Documentation Enforcement" (ligne 632-643)
- `packages/ui/package.json` - Configuration des exports
- `apps/docs/.storybook/` - Configuration Storybook

---

**Dernière mise à jour**: 2025-01-02  
**Version**: 1.0.0  
**Statut**: Documentation de référence
