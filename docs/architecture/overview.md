# 🏗️ Architecture du Boilerplate Infinity

## Vue d'ensemble

Infinity est un boilerplate open-source pour créer des applications de jeux multijoueurs en temps réel. Il combine AdonisJS, React, Inertia.js et Transmit avec une architecture modulaire extensible.

## 🎯 Principes fondamentaux

### 1. Architecture DDD (Domain-Driven Design)
- **Domain** : Entités, événements, plugins de jeux
- **Application** : Use cases, services applicatifs
- **Infrastructure** : Bridges Transmit, repositories, adapters

### 2. Architecture hybride Inertia + Transmit
- **Inertia.js** : Source de vérité initiale (SSR + affichage immédiat)
- **Transmit** : Mises à jour temps réel uniquement
- **Fallback gracieux** : Fonctionne même si Transmit échoue

### 3. Système modulaire d'événements
- Événements génériques par module (lobby, chat, game, etc.)
- Bridges Transmit configurables par domaine
- Registre centralisé pour l'enregistrement des bridges

### 4. Système de plugins de jeux
- Interface `GamePlugin<TState, TAction>` standardisée
- Chargement dynamique des jeux
- Registre centralisé pour l'enregistrement des plugins

## 📁 Structure du projet

```
apps/infinity/
├── app/
│   ├── domain/
│   │   ├── events/
│   │   │   ├── base/                    # Infrastructure générique
│   │   │   │   ├── module_event.ts      # Interface ModuleEvent
│   │   │   │   ├── module_event_bridge.ts
│   │   │   │   └── module_event_registry.ts
│   │   │   └── modules/                 # Événements par domaine
│   │   │       ├── lobby/
│   │   │       │   ├── lobby_events.ts
│   │   │       │   └── lobby_transmit_bridge.ts
│   │   │       ├── chat/
│   │   │       │   ├── chat_events.ts
│   │   │       │   └── chat_transmit_bridge.ts
│   │   │       └── game/
│   │   │           ├── game_events.ts
│   │   │           └── game_transmit_bridge.ts
│   │   ├── games/
│   │   │   ├── base/
│   │   │   │   ├── game_plugin.ts       # Interface GamePlugin
│   │   │   │   └── game_plugin_registry.ts
│   │   │   └── plugins/                 # Jeux installés
│   │   │       ├── tic-tac-toe/
│   │   │       │   ├── tic_tac_toe_plugin.ts
│   │   │       │   └── index.ts
│   │   │       └── ... (ajoutez vos jeux ici)
│   │   ├── entities/
│   │   └── interfaces/
│   ├── application/
│   │   ├── use_cases/
│   │   └── services/
│   ├── infrastructure/
│   └── providers/
│       ├── module_event_provider.ts     # Auto-registration bridges
│       └── game_plugin_provider.ts      # Auto-registration plugins
├── tests/                               # UN SEUL dossier de tests
│   ├── unit/
│   ├── functional/
│   └── integration/
├── inertia/                             # Frontend React
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── hooks/
└── docs/
    └── BOILERPLATE_ARCHITECTURE.md
```

## 🎮 Système de plugins de jeux

### Créer un nouveau jeu

1. **Créer le plugin dans `app/domain/games/plugins/votre-jeu/`**

```typescript
// votre_jeu_plugin.ts
import type { GamePlugin } from '../../base/game_plugin.js'

export interface VotreJeuState {
  // Définir l'état du jeu
}

export interface VotreJeuAction {
  // Définir les actions possibles
}

export class VotreJeuPlugin implements GamePlugin<VotreJeuState, VotreJeuAction> {
  readonly id = 'votre-jeu'
  readonly name = 'Votre Jeu'
  readonly description = 'Description de votre jeu'
  readonly version = '1.0.0'
  readonly minPlayers = 2
  readonly maxPlayers = 4
  readonly estimatedDuration = 30
  readonly tags = ['strategy', 'turn-based']
  readonly defaultConfig = {}

  initializeState(playerUuids: string[]) {
    // Initialiser l'état du jeu
  }

  validateAction(state, playerUuid, action) {
    // Valider une action
  }

  applyAction(state, playerUuid, action) {
    // Appliquer l'action et retourner le nouveau state
  }

  isGameFinished(state) {
    // Vérifier si le jeu est terminé
  }

  getWinner(state) {
    // Retourner le gagnant
  }

  serializeState(state) {
    return JSON.stringify(state)
  }

  deserializeState(serialized) {
    return JSON.parse(serialized)
  }
}
```

2. **Enregistrer le plugin dans `app/domain/games/index.ts`**

```typescript
import { VotreJeuPlugin } from './plugins/votre-jeu/index.js'

export function initializeGamePlugins(): void {
  const registry = getGamePluginRegistry()
  
  registry.register(new TicTacToePlugin())
  registry.register(new VotreJeuPlugin())  // ← Ajoutez ici
}
```

3. **Votre jeu est maintenant disponible !**

## 📡 Système d'événements modulaires

### Ajouter un nouveau module d'événements

1. **Créer les événements dans `app/domain/events/modules/votre-module/`**

```typescript
// votre_module_events.ts
import { ModuleEvent, ModuleEventFactory } from '../../base/module_event.js'

export const VOTRE_MODULE_EVENT_TYPES = {
  ACTION_EFFECTUEE: 'action.effectuee',
} as const

export interface VotreActionData {
  // Données de l'événement
}

export class VotreModuleEventFactory {
  static actionEffectuee(data: VotreActionData, userUuid?: string): ModuleEvent<VotreActionData> {
    return ModuleEventFactory.create('votre-module', VOTRE_MODULE_EVENT_TYPES.ACTION_EFFECTUEE, data, {
      userContext: userUuid ? { userUuid } : undefined,
      tags: ['votre-module', 'action'],
    })
  }
}
```

2. **Créer le bridge Transmit**

```typescript
// votre_module_transmit_bridge.ts
import { BaseModuleEventBridge } from '../../base/module_event_bridge.js'

export class VotreModuleTransmitBridge extends BaseModuleEventBridge {
  readonly moduleName = 'votre-module'
  readonly priority = 5

  async handle(event: ModuleEvent): Promise<void> {
    // Diffuser l'événement via Transmit
  }

  getChannels(event: ModuleEvent): string[] {
    // Déterminer les canaux de diffusion
  }

  transformEvent(event: ModuleEvent): Record<string, any> {
    // Transformer l'événement pour Transmit
  }
}
```

3. **Enregistrer le bridge dans `app/providers/module_event_provider.ts`**

```typescript
import { VotreModuleTransmitBridge } from '#domain/events/modules/votre-module/votre_module_transmit_bridge'

export default class ModuleEventProvider {
  async boot() {
    const registry = getModuleEventRegistry()
    
    registry.register(new LobbyTransmitBridge())
    registry.register(new ChatTransmitBridge())
    registry.register(new GameTransmitBridge())
    registry.register(new VotreModuleTransmitBridge())  // ← Ajoutez ici
  }
}
```

## 🧪 Tests

Les tests sont organisés dans **UN SEUL** dossier : `tests/`

```bash
# Lancer tous les tests
node ace test

# Lancer les tests unitaires
node ace test --suite=unit

# Lancer les tests fonctionnels
node ace test --suite=functional
```

### Convention de nommage
- Fichiers : `*.spec.ts` (pas `.test.ts`)
- Framework : Japa (pas Jest)

## 🎨 Storybook

Développer et documenter les composants UI :

```bash
cd apps/docs
pnpm storybook
```

Les composants lobby sont maintenant fonctionnels avec les providers nécessaires.

## 🚀 Démarrage rapide

1. **Installation**
```bash
pnpm install
```

2. **Configuration**
```bash
cp .env.example .env
# Configurer votre base de données
```

3. **Migrations**
```bash
cd apps/infinity
node ace migration:run
node ace db:seed
```

4. **Démarrage**
```bash
node ace serve --watch
```

## 📝 Conventions

### Imports
- Toujours utiliser les alias `#` pour les imports backend
- Exemples : `#domain/events`, `#application/use_cases`, `#infrastructure`

### Logging
- Backend : Préfixes `📡` (services), `✅` (succès), `❌` (erreurs)
- Frontend : `🎮` (pages), `🔧` (composants), `🎯` (hooks)

### Gestion d'erreurs
- Use cases : Retourner `Result<T>` (jamais throw pour erreurs métier)
- Exceptions : Uniquement pour erreurs système (DB down, IO)

## 🔌 Extensibilité

### Points d'extension
1. **Jeux** : Ajoutez des plugins dans `app/domain/games/plugins/`
2. **Événements** : Ajoutez des modules dans `app/domain/events/modules/`
3. **Use cases** : Ajoutez dans `app/application/use_cases/`
4. **Composants UI** : Ajoutez dans `packages/ui/src/components/`

### Registres globaux
- `GamePluginRegistry` : Tous les jeux disponibles
- `ModuleEventRegistry` : Tous les bridges d'événements

## 📚 Ressources

- [Documentation AdonisJS](https://docs.adonisjs.com/)
- [Documentation Inertia.js](https://inertiajs.com/)
- [Documentation Transmit](https://docs.adonisjs.com/guides/transmit)
- [Shadcn UI](https://ui.shadcn.com/)

## 🤝 Contribution

Ce boilerplate est conçu pour être extensible. Les contributions sont les bienvenues !

1. Fork le projet
2. Créez votre branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Committez vos changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Pushez vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrez une Pull Request

## 📄 Licence

MIT - Libre d'utilisation pour vos projets personnels et commerciaux.
