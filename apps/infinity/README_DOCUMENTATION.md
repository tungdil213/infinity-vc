# 📚 Documentation du Projet Infinity

## 📁 Structure de la Documentation

### Documents Actifs

- **`ARCHITECTURE_FINAL.md`** - Architecture complète du système de lobbies (👈 COMMENCER ICI)
- **`LOBBY_SYNC_FIX_SUMMARY.md`** - Historique détaillé du fix de synchronisation

### Archives

Les anciens documents de debug et de refactoring ont été archivés dans `docs/archives/`.  
Ils sont conservés pour référence historique mais ne sont plus maintenus.

## 🚀 Quick Start

1. **Lire `ARCHITECTURE_FINAL.md`** pour comprendre l'architecture actuelle
2. **Consulter le code** dans :
   - `inertia/services/` - Services (LobbyService, singleton)
   - `inertia/hooks/` - Hooks React
   - `inertia/pages/` - Pages principales

## 🔧 Points Techniques Clés

### Architecture Singleton

Le système utilise un **singleton global** pour éviter les race conditions React :

```typescript
import { getLobbyService } from './services/lobby_service_singleton'

const lobbyService = getLobbyService() // Toujours disponible
```

### Architecture Hybride

- **Inertia** = Données initiales (chargement serveur)
- **Transmit** = Mises à jour temps réel (SSE)

### Logging Minimal

Les logs de debug ont été nettoyés. Seuls les logs essentiels restent :
- ✅ Événements importants (création lobby, connexion)
- ❌ Erreurs critiques
- ⚠️ Avertissements

## 📊 Commandes Utiles

```bash
# Développement
cd apps/infinity && node ace serve --watch

# Tests
pnpm run test

# Linting
pnpm run lint --fix

# Build
pnpm run build
```

## 🐛 Debugging

### Vérifier la Connexion Transmit

Console navigateur :
```javascript
// Vérifier la connexion
const manager = window.__TRANSMIT_MANAGER__
console.log(manager.isConnected())

// Vérifier le singleton
import { getLobbyService } from './services/lobby_service_singleton'
console.log(getLobbyService())
```

### Logs à Observer

```
✅ Normal:
📡 LobbyService: Initializing with X lobbies
📡 LobbyService: Transmit listeners ready
📡 LobbyService: Event received: lobby.created

❌ Problème:
📡 LobbyService: Invalid lobby data
🎯 useLobbyList: Service not yet available
```

## 🔄 Workflow de Développement

### 1. Modifier le Backend

```typescript
// app/events/lobby/lobby_created.ts
export default class LobbyCreated {
  // Toujours envoyer l'état complet
  public toJSON() {
    return {
      lobby: {
        uuid: this.lobby.uuid,
        name: this.lobby.name,
        players: this.lobby.players, // ✅ Important!
        // ...
      }
    }
  }
}
```

### 2. Bridge Transmit

```typescript
// app/transmit/transmit_event_bridge.ts
export default class TransmitEventBridge {
  @subscribe()
  public async onLobbyCreated(event: LobbyCreatedEvent) {
    const payload = event.toJSON()
    transmit.broadcast('lobbies', {
      type: 'lobby.created',
      ...payload // Diffuse l'état complet
    })
  }
}
```

### 3. Frontend Service

```typescript
// inertia/services/lobby_service.ts
private handleLobbyCreated(event: any) {
  const newLobby = event.data.lobby // Reçoit l'état complet
  
  // Ajouter avec immutabilité
  this.lobbyListState = {
    ...this.lobbyListState,
    lobbies: [...this.lobbyListState.lobbies, newLobby]
  }
  
  // Notifier les abonnés
  this.notifyLobbyListSubscribers()
}
```

### 4. Frontend Hook

```typescript
// inertia/hooks/use_lobby_list.ts
export function useLobbyList(options = {}, initialLobbies = []) {
  const lobbyService = getLobbyService() // Singleton
  
  // S'abonner aux updates
  useEffect(() => {
    if (!lobbyService) return
    
    lobbyService.initializeWithInertiaData(initialLobbies)
    const unsubscribe = lobbyService.subscribeLobbyList(setLocalState)
    return () => unsubscribe()
  }, [lobbyService])
}
```

## 📝 Règles de Code

### Immutabilité

❌ **Mauvais:**
```typescript
this.lobbies.push(newLobby) // Mutation directe
```

✅ **Bon:**
```typescript
this.lobbies = [...this.lobbies, newLobby] // Immutable
```

### Logging

❌ **Mauvais:**
```typescript
console.log('Debug: value is', value)
console.log('Step 1', 'Step 2', 'Step 3')
```

✅ **Bon:**
```typescript
console.log('📡 Service: Action completed', { value })
console.error('❌ Service: Failed', error)
```

### Timeout

❌ **Mauvais:**
```typescript
const data = await fetch() // Peut bloquer indéfiniment
```

✅ **Bon:**
```typescript
useEffect(() => {
  const timeout = setTimeout(() => {
    setLoading(false)
  }, 5000)
  return () => clearTimeout(timeout)
}, [loading])
```

## 🚨 Migration Future (Optionnelle)

Pour aller plus loin, migration vers **Zustand** recommandée :

**Avantages:**
- Plus simple que Context API
- Pas de race conditions
- DevTools intégrés
- Performance optimale

Voir `ARCHITECTURE_FINAL.md` pour l'exemple de code Zustand.

---

**Dernière mise à jour:** 1er novembre 2025  
**Statut:** ✅ Documentation à jour avec le code production
