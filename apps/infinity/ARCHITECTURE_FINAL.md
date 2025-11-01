# 🏗️ Architecture Finale - Système de Lobbies Temps Réel

## 📝 Vue d'Ensemble

Ce document consolide l'architecture finale du système de lobbies avec synchronisation temps réel.

## ✅ Architecture Implémentée

### Pattern Singleton Global

Après avoir résolu les problèmes de race conditions React Context, nous utilisons un **singleton global** pour le `LobbyService`.

```typescript
// lobby_service_singleton.ts
let globalLobbyService: LobbyService | null = null

export function initializeLobbyService(transmitContext: TransmitContextType): LobbyService {
  if (!globalLobbyService && transmitContext) {
    globalLobbyService = new LobbyService(transmitContext)
  }
  return globalLobbyService!
}

export function getLobbyService(): LobbyService | null {
  return globalLobbyService
}
```

**Avantages:**
- ✅ Aucune race condition possible
- ✅ Service disponible immédiatement partout
- ✅ Pas de dépendance sur l'ordre de montage React
- ✅ Compatible avec l'architecture actuelle

### Architecture Hybride Inertia + Transmit

**Principe**: Inertia pour les données initiales, Transmit pour les mises à jour temps réel.

```typescript
// Page Lobbies
export default function Lobbies({ lobbies: initialLobbies }: Props) {
  const { lobbies, ... } = useLobbyList({}, initialLobbies)
  // ...
}

// Hook useLobbyList
export function useLobbyList(options = {}, initialLobbies = []) {
  const lobbyService = getLobbyService() // Singleton global
  
  // État initial = données Inertia
  const [localState, setLocalState] = useState({
    lobbies: initialLobbies,
    loading: false,
    ...
  })
  
  useEffect(() => {
    if (!lobbyService) return
    
    // Initialiser avec Inertia
    lobbyService.initializeWithInertiaData(initialLobbies)
    
    // S'abonner aux updates Transmit
    const unsubscribe = lobbyService.subscribeLobbyList((newState) => {
      setLocalState(convertLobbyListState(newState))
    })
    
    return () => unsubscribe()
  }, [lobbyService])
}
```

## 🔄 Flux de Données

```
Backend Event
    ↓
TransmitEventBridge (convertit en événement Transmit)
    ↓
Transmit SSE (diffuse aux clients)
    ↓
TransmitManager (client)
    ↓
LobbyService (singleton, gère l'état)
    ↓
Subscribers (hooks React)
    ↓
Components (UI)
```

## 📁 Structure des Fichiers

### Services
- `lobby_service.ts` - Service principal de gestion des lobbies
- `lobby_service_singleton.ts` - Singleton global (évite race conditions)
- `transmit_manager.ts` - Gestion de la connexion Transmit

### Hooks
- `use_lobby_list.ts` - Hook pour la liste des lobbies (utilise le singleton)
- `use_lobby_details.ts` - Hook pour les détails d'un lobby spécifique

### Contexts
- `LobbyContext.tsx` - Context React (initialise le singleton)
- `TransmitContext.tsx` - Context pour la connexion Transmit

### Pages
- `lobbies.tsx` - Page liste des lobbies
- `game_lobby.tsx` - Page détails d'un lobby

## 🎯 Conventions de Logging

Les logs suivent une convention standardisée avec emojis :

- `📡 LobbyService` - Événements service
- `🎯 useLobbyList` - Événements hook
- `🎮 Lobbies PAGE` - Événements page
- `🔧 LobbyProvider` - Événements provider

**Logging minimal** : Seuls les événements importants et erreurs sont loggés.

## 🚀 Points Techniques Importants

### 1. Immutabilité Stricte

Tous les updates d'état utilisent l'immutabilité :

```typescript
this.lobbyListState = {
  ...this.lobbyListState,
  lobbies: [...this.lobbyListState.lobbies, newLobby],
  total: this.lobbyListState.lobbies.length + 1
}
```

### 2. Throttling

Les mises à jour sont throttlées à 100ms (max 10/seconde) :

```typescript
const now = Date.now()
if (now - lastUpdateRef.current > 100) {
  setLocalState(newState)
  lastUpdateRef.current = now
}
```

### 3. Timeout Protection

Tous les hooks ont une protection timeout (5s) :

```typescript
useEffect(() => {
  if (localState.loading && !timeoutReached) {
    timeoutRef.current = setTimeout(() => {
      setTimeoutReached(true)
      setLocalState(prev => ({ ...prev, loading: false }))
    }, 5000)
  }
}, [localState.loading, timeoutReached])
```

### 4. Fallback Gracieux

Si Transmit échoue, le système continue avec les données Inertia :

```typescript
try {
  await this.transmitContext.subscribeToLobbies(callback)
  console.log('📡 LobbyService: Transmit listeners ready')
} catch (error) {
  console.error('📡 LobbyService: Transmit failed', error)
  // Continue avec données Inertia uniquement
}
```

## 📊 Événements Transmit

### Événements Globaux (canal `lobbies`)
- `lobby.created` - Nouveau lobby créé
- `lobby.deleted` - Lobby supprimé
- `lobby.status.changed` - Statut du lobby changé

### Événements Spécifiques (canal `lobbies/{uuid}`)
- `lobby.player.joined` - Joueur a rejoint
- `lobby.player.left` - Joueur a quitté
- `lobby.player.ready` - Joueur prêt
- `lobby.started` - Partie démarrée

## 🔧 Commandes Utiles

```bash
# Lancer le serveur
cd apps/infinity && node ace serve --watch

# Tests
cd apps/infinity && pnpm run test

# Linting
cd apps/infinity && pnpm run lint --fix
```

## 📝 Migration Future (Optionnelle)

Pour une architecture encore plus robuste, migration vers **Zustand** recommandée :

```typescript
// lobby_store.ts
import { create } from 'zustand'

export const useLobbyStore = create<LobbyStore>((set) => ({
  lobbies: [],
  lobbyService: null,
  
  setLobbyService: (service) => set({ lobbyService: service }),
  addLobby: (lobby) => set((state) => ({
    lobbies: [...state.lobbies, lobby]
  })),
  removeLobby: (uuid) => set((state) => ({
    lobbies: state.lobbies.filter(l => l.uuid !== uuid)
  })),
}))
```

**Avantages Zustand** :
- Plus simple que Context API
- Pas de race conditions
- DevTools intégrés
- Performance optimisée
- Pattern standard reconnu

## 🐛 Debugging

### Vérifier la Connexion Transmit

```typescript
// Dans la console navigateur
const transmitManager = window.__TRANSMIT_MANAGER__
console.log(transmitManager.isConnected())
```

### Vérifier le Singleton

```typescript
// Dans la console navigateur
import { getLobbyService } from './services/lobby_service_singleton'
console.log(getLobbyService())
```

### Logs à Observer

```
✅ Succès:
📡 LobbyService: Initializing with X lobbies
📡 LobbyService: Configuration Transmit listeners
📡 LobbyService: Transmit listeners ready
📡 LobbyService: Event received: lobby.created
📡 LobbyService: Lobby created: TestLobby (total: 2)

❌ Erreur:
📡 LobbyService: Invalid lobby data in create event
📡 LobbyService: Transmit failed
🎯 useLobbyList: Service not yet available on mount
```

## 📚 Références

- Backend Events: `apps/infinity/app/events/lobby/`
- Transmit Bridge: `apps/infinity/app/transmit/transmit_event_bridge.ts`
- Frontend Services: `apps/infinity/inertia/services/`
- Documentation détaillée: `LOBBY_SYNC_FIX_SUMMARY.md` (historique du fix)

---

**Dernière mise à jour:** 1er novembre 2025  
**Statut:** ✅ Production-ready
