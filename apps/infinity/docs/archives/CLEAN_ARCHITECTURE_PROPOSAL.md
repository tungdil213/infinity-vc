# 🏗️ Architecture Professionnelle: Single Source of Truth

## 🔴 Problème Actuel: Multiples Sources de Vérité

### Architecture Actuelle (Problématique)

```
┌─────────────────────────────────────────────────────┐
│  SOURCES DE VÉRITÉ MULTIPLES (Désynchronisation)   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. LobbyService Cache (lobbyDetailsCache)         │
│     └─ Map<lobbyUuid, lobby>                       │
│                                                     │
│  2. Context State (LobbyProvider)                   │
│     └─ useState({ lobby, loading, error })         │
│                                                     │
│  3. Hook State (useLobbyDetails)                    │
│     └─ useReducer(lobbyReducer, initialState)      │
│                                                     │
│  4. Component Local State                           │
│     └─ useState(lastValidLobby)                    │
│                                                     │
│  5. Inertia Props (SSR)                             │
│     └─ initialLobby from backend                   │
└─────────────────────────────────────────────────────┘

❌ Résultat: Incohérences, mutations, bugs
```

### Logs du Problème

```javascript
// Service dit: pas de lobby
📡 LobbyService: Lobby introuvable: 63670e0a...
{ lobby: null }

// Composant dit: j'ai un lobby!
🎮 GameLobby: hasLobby: true, players: 2

// → DÉSYNCHRONISATION!
```

## ✅ Solution: Architecture BGA-Style

### Principe: **Single Store + Flux Uni-Directionnel**

```
┌──────────────────────────────────────────────────────────┐
│  SINGLE SOURCE OF TRUTH                                  │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │  ZUSTAND STORE (Immer pour immutabilité)       │     │
│  │                                                 │     │
│  │  state = {                                      │     │
│  │    lobbies: Map<uuid, Lobby>  // Liste         │     │
│  │    currentLobby: Lobby | null // Détails       │     │
│  │    loading: boolean                             │     │
│  │    error: string | null                         │     │
│  │  }                                              │     │
│  └────────────────────────────────────────────────┘     │
│           ▲                            │                 │
│           │                            │                 │
│        Actions                      Selectors            │
│     (mutations)                   (read-only)            │
└──────────────────────────────────────────────────────────┘
           ▲                            │
           │                            ▼
    ┌──────┴────────┐         ┌────────────────┐
    │  Transmit     │         │  Components    │
    │  Events       │         │  (Pure)        │
    └───────────────┘         └────────────────┘
```

## 🎯 Implémentation: Zustand Store

### 1. **Store Central** (`stores/lobby_store.ts`)

```typescript
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface Player {
  uuid: string
  nickName: string
}

interface Lobby {
  uuid: string
  name: string
  players: Player[]
  currentPlayers: number
  maxPlayers: number
  status: string
  canStart: boolean
  createdBy: string
  createdAt: Date
}

interface LobbyState {
  // État
  lobbies: Map<string, Lobby>      // Liste globale
  currentLobby: Lobby | null        // Lobby actuel
  loading: boolean
  error: string | null

  // Actions (mutations via Immer)
  setLobbies: (lobbies: Lobby[]) => void
  setCurrentLobby: (lobby: Lobby | null) => void
  updateLobby: (lobbyUuid: string, updates: Partial<Lobby>) => void
  replaceLobby: (lobby: Lobby) => void  // ✅ Backend as source of truth
  removeLobby: (lobbyUuid: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useLobbyStore = create<LobbyState>()(
  immer((set) => ({
    // État initial
    lobbies: new Map(),
    currentLobby: null,
    loading: false,
    error: null,

    // ✅ Actions: Immutables via Immer
    setLobbies: (lobbies) =>
      set((state) => {
        state.lobbies = new Map(lobbies.map((l) => [l.uuid, l]))
      }),

    setCurrentLobby: (lobby) =>
      set((state) => {
        state.currentLobby = lobby
        state.loading = false
        state.error = null
      }),

    // ✅ BACKEND AS SOURCE OF TRUTH
    // Quand on reçoit un event, on REMPLACE complètement le lobby
    replaceLobby: (lobby) =>
      set((state) => {
        console.log('🏪 Store: Replacing lobby from backend', {
          uuid: lobby.uuid,
          players: lobby.players.length,
        })
        
        // Update dans la liste
        state.lobbies.set(lobby.uuid, lobby)
        
        // Si c'est le lobby actuel, le remplacer aussi
        if (state.currentLobby?.uuid === lobby.uuid) {
          state.currentLobby = lobby
        }
      }),

    updateLobby: (lobbyUuid, updates) =>
      set((state) => {
        const lobby = state.lobbies.get(lobbyUuid)
        if (lobby) {
          Object.assign(lobby, updates)
        }
        if (state.currentLobby?.uuid === lobbyUuid) {
          Object.assign(state.currentLobby, updates)
        }
      }),

    removeLobby: (lobbyUuid) =>
      set((state) => {
        state.lobbies.delete(lobbyUuid)
        if (state.currentLobby?.uuid === lobbyUuid) {
          state.currentLobby = null
        }
      }),

    setLoading: (loading) =>
      set((state) => {
        state.loading = loading
      }),

    setError: (error) =>
      set((state) => {
        state.error = error
        state.loading = false
      }),

    reset: () =>
      set((state) => {
        state.lobbies.clear()
        state.currentLobby = null
        state.loading = false
        state.error = null
      }),
  }))
)

// ✅ Selectors (fonctions dérivées pour optimisation)
export const selectCurrentLobby = (state: LobbyState) => state.currentLobby
export const selectLobbyByUuid = (uuid: string) => (state: LobbyState) =>
  state.lobbies.get(uuid)
export const selectAllLobbies = (state: LobbyState) =>
  Array.from(state.lobbies.values())
export const selectLoading = (state: LobbyState) => state.loading
export const selectError = (state: LobbyState) => state.error
```

### 2. **Event Handler** (`services/transmit_event_handler.ts`)

```typescript
import { useLobbyStore } from '../stores/lobby_store'

export class TransmitEventHandler {
  /**
   * ✅ SIMPLE: Event → Dispatch Action → Store Update
   * Pas de logique métier, juste relay
   */
  handleLobbyPlayerJoined(event: any) {
    const { lobbyUuid, lobby: updatedLobby } = event.data

    console.log('📡 Event: player.joined', {
      lobbyUuid,
      players: updatedLobby?.players?.length,
    })

    if (updatedLobby) {
      // ✅ Backend as source of truth: REMPLACER complètement
      useLobbyStore.getState().replaceLobby({
        ...updatedLobby,
        uuid: lobbyUuid,
      })
    }
  }

  handleLobbyPlayerLeft(event: any) {
    const { lobbyUuid, lobby: updatedLobby, wasDeleted } = event.data

    console.log('📡 Event: player.left', {
      lobbyUuid,
      wasDeleted,
      players: updatedLobby?.players?.length,
    })

    if (wasDeleted) {
      // Lobby supprimé
      useLobbyStore.getState().removeLobby(lobbyUuid)
    } else if (updatedLobby) {
      // ✅ Remplacer avec état du backend
      useLobbyStore.getState().replaceLobby({
        ...updatedLobby,
        uuid: lobbyUuid,
      })
    }
  }

  handleLobbyStatusChanged(event: any) {
    const { lobbyUuid, newStatus } = event.data

    console.log('📡 Event: status.changed', { lobbyUuid, newStatus })

    useLobbyStore.getState().updateLobby(lobbyUuid, {
      status: newStatus,
    })
  }
}
```

### 3. **Transmit Manager** (simplifié)

```typescript
export class TransmitManager {
  private eventHandler: TransmitEventHandler

  constructor() {
    this.eventHandler = new TransmitEventHandler()
  }

  private handleMessage(channel: string, message: any) {
    console.log(`📡 Transmit: Message on ${channel}`, message.type)

    // ✅ SIMPLE: Router vers le bon handler
    switch (message.type) {
      case 'lobby.player.joined':
        this.eventHandler.handleLobbyPlayerJoined(message)
        break

      case 'lobby.player.left':
        this.eventHandler.handleLobbyPlayerLeft(message)
        break

      case 'lobby.status.changed':
        this.eventHandler.handleLobbyStatusChanged(message)
        break

      case 'lobby.deleted':
        this.eventHandler.handleLobbyDeleted(message)
        break

      default:
        console.warn('📡 Unknown event type:', message.type)
    }
  }
}
```

### 4. **Composants** (Pure, sans state)

#### GameLobby.tsx

```typescript
import { useLobbyStore, selectCurrentLobby } from '../stores/lobby_store'

export function GameLobby({ lobbyUuid, currentUser }) {
  // ✅ PURE: Lit juste le store (pas de state local)
  const lobby = useLobbyStore(selectCurrentLobby)
  const loading = useLobbyStore((state) => state.loading)
  const error = useLobbyStore((state) => state.error)

  // ✅ Charger le lobby initial (une seule fois)
  useEffect(() => {
    if (lobbyUuid) {
      loadLobbyDetails(lobbyUuid)
    }
  }, [lobbyUuid])

  // ✅ Dérivations (pas de state)
  const isUserInLobby = useMemo(
    () => lobby?.players?.some((p) => p.uuid === currentUser.uuid) || false,
    [lobby?.players, currentUser.uuid]
  )

  console.log('🎮 GameLobby: Rendering', {
    hasLobby: !!lobby,
    players: lobby?.players?.length,
    isUserInLobby,
  })

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!lobby) return <div>Lobby not found</div>

  return (
    <div>
      <h1>{lobby.name}</h1>
      <p>{lobby.currentPlayers}/{lobby.maxPlayers} players</p>
      
      {/* ✅ Affichage simple depuis le store */}
      {lobby.players.map((player) => (
        <PlayerCard key={player.uuid} player={player} />
      ))}
    </div>
  )
}
```

#### LobbyStatusSidebar.tsx

```typescript
import { useLobbyStore, selectCurrentLobby } from '../stores/lobby_store'

export function LobbyStatusSidebar({ currentUser }) {
  // ✅ PURE: Même store que GameLobby
  const lobby = useLobbyStore(selectCurrentLobby)

  console.log('🔧 Sidebar: Rendering', {
    hasLobby: !!lobby,
    players: lobby?.players?.length,
  })

  if (!lobby) return null

  return (
    <div className="sidebar">
      <h3>{lobby.name}</h3>
      <p>{lobby.currentPlayers}/{lobby.maxPlayers}</p>
      {/* ✅ Toujours synchronisé avec GameLobby! */}
    </div>
  )
}
```

## 🎯 Avantages Architecture Zustand

### 1. **Single Source of Truth**

```
❌ AVANT: 5 sources de vérité
✅ APRÈS: 1 seul store Zustand
```

### 2. **Pas de Désynchronisation**

```typescript
// ✅ Tous les composants lisent le MÊME store
const lobby = useLobbyStore(selectCurrentLobby)

// Impossible d'avoir:
// - GameLobby: hasLobby: true
// - Sidebar: hasLobby: false
// → Toujours synchronisés!
```

### 3. **Immutabilité Garantie**

```typescript
// ✅ Immer middleware = mutations sûres
set((state) => {
  state.lobbies.set(uuid, lobby)  // Looks like mutation
  // → Immer crée un nouvel objet immutable
})
```

### 4. **Performance Optimisée**

```typescript
// ✅ Re-render SEULEMENT si currentLobby change
const lobby = useLobbyStore(selectCurrentLobby)

// Pas de re-render si autre partie du store change
```

### 5. **Debugging Facile**

```typescript
// ✅ DevTools Zustand
// - Voir tout l'état
// - Time-travel debugging
// - Trace des actions
```

### 6. **Flux Uni-Directionnel Clair**

```
Event → Action → Store → Components
  ↓        ↓       ↓         ↓
Backend  Simple  Source   Display
         Relay   Vérité   Only
```

## 📊 Comparaison: Avant vs Après

| Aspect | Avant ❌ | Après ✅ |
|---|---|---|
| **Sources de vérité** | 5 (désynchronisées) | 1 (Zustand) |
| **State local** | Dans chaque composant | Aucun |
| **Cache** | LobbyService Map | Store unique |
| **Mutations** | Multiples endroits | Actions centralisées |
| **Debugging** | Impossible | DevTools Zustand |
| **Performance** | Re-renders inutiles | Optimisé (selectors) |
| **Testabilité** | Difficile | Facile (pure functions) |
| **Complexité** | ~500 lignes | ~200 lignes |

## 🚀 Migration Progressive

### Étape 1: Installer Zustand

```bash
pnpm add zustand immer
```

### Étape 2: Créer le Store

```typescript
// stores/lobby_store.ts
export const useLobbyStore = create(immer(...))
```

### Étape 3: Migrer Event Handlers

```typescript
// Au lieu de:
this.updateLobbyDetail(uuid, (lobby) => {...})

// Faire:
useLobbyStore.getState().replaceLobby(lobby)
```

### Étape 4: Migrer Composants

```typescript
// Au lieu de:
const { lobby } = useLobbyDetails(uuid)

// Faire:
const lobby = useLobbyStore(selectCurrentLobby)
```

### Étape 5: Supprimer Ancien Code

- Supprimer `lobbyDetailsCache` de LobbyService
- Supprimer `LobbyContext` (remplacé par Zustand)
- Supprimer `lobbyReducer` (remplacé par actions Zustand)
- Supprimer state local dans composants

## 💡 Pattern BGA: Event Sourcing

Board Game Arena utilise probablement:

```typescript
// Pattern Event Sourcing complet
interface GameAction {
  type: string
  payload: any
  timestamp: number
  playerId: string
}

// Store avec historique
const gameStore = create((set) => ({
  gameState: initialState,
  actions: [] as GameAction[],
  
  dispatch: (action: GameAction) => set((state) => ({
    gameState: reducer(state.gameState, action),
    actions: [...state.actions, action]
  })),
  
  // Time-travel: rejouer l'historique
  replay: (toTimestamp: number) => {
    const actions = state.actions.filter(a => a.timestamp <= toTimestamp)
    return actions.reduce(reducer, initialState)
  }
}))
```

## 🎯 Résultat Final

Avec cette architecture:

✅ **Une seule source de vérité** (Zustand store)
✅ **Flux uni-directionnel** (Event → Action → Store → UI)
✅ **Immutabilité garantie** (Immer middleware)
✅ **Pas de désynchronisation** (même store partout)
✅ **Performance optimale** (selectors + shallow equality)
✅ **Debugging facile** (DevTools + logs centralisés)
✅ **Code simple** (~60% moins de code)
✅ **Testable** (pure functions)

## 📚 Ressources

- Zustand: https://zustand-demo.pmnd.rs/
- Immer: https://immerjs.github.io/immer/
- BGA Architecture: https://en.doc.boardgamearena.com/BGA_Studio_Cookbook
- Event Sourcing: https://martinfowler.com/eaaDev/EventSourcing.html

Cette architecture est utilisée par les applications React professionnelles de haute qualité ! 🚀
