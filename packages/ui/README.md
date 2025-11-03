# @tyfo.dev/ui

> Design system partagé pour le monorepo Infinity. Composants React avec Shadcn UI + TailwindCSS.

## 📦 Installation

Ce package est utilisé en interne dans le monorepo. Il est automatiquement disponible via les workspaces pnpm.

```bash
# Dans votre package.json
{
  "dependencies": {
    "@tyfo.dev/ui": "workspace:*"
  }
}
```

## 🎨 Composants disponibles

### Primitives Shadcn (46 composants)
Tous les composants Shadcn UI sont disponibles :

```typescript
import { 
  Button, 
  Card, 
  Dialog, 
  Input, 
  Select,
  // ... et 41 autres
} from '@tyfo.dev/ui'
```

### Composants spécifiques Lobby

```typescript
import { 
  LobbyCard,
  LobbyList,
  LobbyStatusBadge,
  LobbyCapacityBadge,
  LobbyPrivacyBadge,
  PlayerAvatar 
} from '@tyfo.dev/ui'
```

### Layout

```typescript
import { Header, Footer } from '@tyfo.dev/ui'
```

## 📚 Documentation Storybook

Tous les composants sont documentés dans Storybook :

```bash
cd apps/docs
pnpm dev
```

Visitez http://localhost:6006

## 🛠️ Développement

### Build

```bash
pnpm build
```

Génère :
- `dist/` - Fichiers compilés
- `dist/index.js` - Export principal
- `dist/styles/globals.css` - Styles TailwindCSS

### Mode développement

```bash
pnpm dev
```

Watch mode avec rebuild automatique.

## 📖 Utilisation

### Import du CSS

```typescript
// Dans votre layout principal
import '@tyfo.dev/ui/styles'
```

### Import des composants

```typescript
// Import depuis la racine
import { Button, Card } from '@tyfo.dev/ui'

// Import depuis les sous-chemins (si configuré)
import { Button } from '@tyfo.dev/ui/primitives/button'
import { LobbyCard } from '@tyfo.dev/ui/lobby-card'
```

### Exemple complet

```typescript
import { Card, CardContent, CardHeader, CardTitle, Button } from '@tyfo.dev/ui'

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hello World</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  )
}
```

## 🎨 Thèmes

Les composants supportent le dark mode via `next-themes` :

```typescript
import { ThemeProvider } from 'next-themes'

function App() {
  return (
    <ThemeProvider attribute="class">
      {/* Votre app */}
    </ThemeProvider>
  )
}
```

## 🔧 Configuration

### TailwindCSS

Le package utilise TailwindCSS v4. Les styles sont déjà compilés dans `dist/styles/globals.css`.

### TypeScript

Types automatiquement générés dans `dist/` :

```typescript
// Les types sont automatiquement disponibles
import type { ButtonProps } from '@tyfo.dev/ui'
```

## 📦 Exports

```json
{
  ".": "./dist/index.js",           // Export principal
  "./primitives/*": "./dist/components/primitives/*.js",
  "./hooks/*": "./dist/hooks/*.js",
  "./utils": "./dist/utils.js",
  "./styles": "./dist/styles/globals.css"
}
```

## 🤝 Contribution

Pour ajouter un nouveau composant :

1. Créer dans `src/components/`
2. Exporter dans `src/index.ts`
3. Créer une story dans `apps/docs/stories/`
4. Rebuild le package

## 📄 Licence

MIT
