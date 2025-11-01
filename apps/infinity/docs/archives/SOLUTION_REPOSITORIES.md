# 🎯 Solution complète - Problème des interfaces Repository

## ❌ Le problème

**Les interfaces TypeScript n'existent pas en JavaScript** après compilation.

Tous les use cases et handlers qui font :
```typescript
import { LobbyRepository } from '../repositories/lobby_repository.js'
```

→ **ERREUR** : `does not provide an export named 'LobbyRepository'`

Pourquoi ? `LobbyRepository` est une **interface**, pas une classe.

## ✅ Solution appliquée

### 1. Créé un RepositoryProvider

**Fichier** : `/app/providers/repository_provider.ts`

```typescript
import { ApplicationService } from '@adonisjs/core/types'
import { InMemoryLobbyRepository } from '../infrastructure/repositories/in_memory_lobby_repository.js'
import { InMemoryPlayerRepository } from '../infrastructure/repositories/in_memory_player_repository.js'

export default class RepositoryProvider {
  constructor(protected app: ApplicationService) {}

  async register() {
    console.log('📦 RepositoryProvider: Registering repositories...')

    // Enregistrer les implémentations concrètes comme singletons
    this.app.container.singleton(InMemoryLobbyRepository, () => {
      return new InMemoryLobbyRepository()
    })

    this.app.container.singleton(InMemoryPlayerRepository, () => {
      return new InMemoryPlayerRepository()
    })

    console.log('✅ RepositoryProvider: Repositories registered')
  }
}
```

### 2. Enregistré le provider dans `adonisrc.ts`

```typescript
providers: [
  // ... autres providers
  () => import('#providers/app_provider'),
  () => import('#providers/repository_provider'),  // ← AJOUTÉ
  () => import('@adonisjs/transmit/transmit_provider'),
],
```

### 3. Modifié TOUS les use cases pour utiliser les classes concrètes

**Avant** :
```typescript
import { LobbyRepository } from '../repositories/lobby_repository.js'  // ❌ Interface

@inject()
export class CreateLobbyUseCase {
  constructor(
    private lobbyRepository: LobbyRepository  // ❌ Interface
  ) {}
}
```

**Après** :
```typescript
import { InMemoryLobbyRepository } from '../../infrastructure/repositories/in_memory_lobby_repository.js'  // ✅ Classe

@inject()
export class CreateLobbyUseCase {
  constructor(
    private lobbyRepository: InMemoryLobbyRepository  // ✅ Classe concrète
  ) {}
}
```

### 4. Fichiers modifiés

- `/app/providers/repository_provider.ts` → **CRÉÉ**
- `/adonisrc.ts` → Ajout du provider
- `/app/application/use_cases/create_lobby_use_case.ts` → Import classes concrètes
- `/app/application/use_cases/join_lobby_use_case.ts` → Import classes concrètes  
- `/app/application/use_cases/leave_lobby_use_case.ts` → Import classes concrètes
- `/app/infrastructure/events/lobby_event_handlers.ts` → Suppression dépendance LobbyRepository

## 🚀 Test maintenant

```bash
cd apps/infinity

# Nettoyer TOUT
rm -rf build/ .adonisjs/ node_modules/.vite

# Lancer
pnpm run dev
```

### Logs attendus

```
📦 RepositoryProvider: Registering repositories...
✅ RepositoryProvider: Repositories registered

[ info ] starting HTTP server...
🚀 EventBusSingleton: Initializing Event-Driven system...
🎯 EventSystemFactory: Registering Lobby domain handlers...
✅ EventSystemFactory: Event-Driven system initialized successfully

[ info ] started HTTP server on localhost:3333
```

### Si ça ne marche TOUJOURS pas

Il faut peut-être modifier **TOUS** les autres use cases aussi. Liste complète à vérifier :

```bash
# Rechercher tous les fichiers qui importent LobbyRepository
grep -r "import.*LobbyRepository.*from" app/application/use_cases/*.ts

# Pour chacun, remplacer par :
# import { InMemoryLobbyRepository } from '../../infrastructure/repositories/in_memory_lobby_repository.js'
```

## 📋 Checklist complète

- [ ] RepositoryProvider créé
- [ ] Provider enregistré dans adonisrc.ts
- [ ] CreateLobbyUseCase modifié
- [ ] JoinLobbyUseCase modifié
- [ ] LeaveLobbyUseCase modifié
- [ ] **TOUS les autres use cases modifiés** (list_lobbies, show_lobby, start_game, kick_player, etc.)
- [ ] lobby_event_handlers.ts ne dépend plus de LobbyRepository
- [ ] Serveur démarre sans erreur
- [ ] Logs 📦 et 🚀 visibles

## 🎓 Pourquoi cette solution ?

**En TypeScript/JavaScript** :
- ✅ `class InMemoryLobbyRepository` → Existe en JS après compilation
- ❌ `interface LobbyRepository` → Disparaît après compilation
- ✅ AdonisJS `@inject()` peut injecter des **classes**
- ❌ AdonisJS `@inject()` NE PEUT PAS injecter des **interfaces**

**En DDD** :
- Idéalement, on voudrait injecter l'interface (Dependency Inversion)
- Mais avec TypeScript/AdonisJS, on doit injecter la classe concrète
- Alternative : Utiliser un Token d'injection abstrait, mais c'est plus complexe

---

**Si le serveur démarre, créez un lobby et vérifiez que les logs Event-Driven apparaissent ! 🎉**
