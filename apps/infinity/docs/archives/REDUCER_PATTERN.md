# 🎯 Architecture Reducer/Dispatcher pour React

## 🔴 Problème avec les Tableaux React

React ne détecte pas les changements dans les tableaux **mutés** :

```typescript
// ❌ MAUVAIS - Mutation directe
state.lobby.players.push(newPlayer)  // React ne détecte pas!

// ❌ MAUVAIS - Modification d'élément
state.lobby.players[0].isReady = true  // React ne re-render pas!

// ❌ MAUVAIS - Filter sans créer nouveau tableau
state.lobby.players = state.lobby.players.filter(...)  // Mutation partielle
```

**Résultat**: On perd des informations, l'UI ne se met pas à jour, comportement imprévisible.

## ✅ Solution: Reducer Pattern avec Immutabilité

### Architecture

```
Event Transmit → Action Creator → Reducer → Nouveau State → React Re-render
```

### 1. **Actions** (reducers/lobby_reducer.ts)

Définir toutes les actions possibles:

```typescript
export type LobbyAction =
  | { type: 'SET_LOBBY'; payload: LobbyData }
  | { type: 'PLAYER_JOINED'; payload: { player: any; playerCount: number } }
  | { type: 'PLAYER_LEFT'; payload: { playerUuid: string; playerCount: number } }
  | { type: 'STATUS_CHANGED'; payload: { status: string } }
  | { type: 'UPDATE_LOBBY'; payload: Partial<LobbyData> }
  | { type: 'RESET' }
```

### 2. **Reducer** (Gestion Immutable)

```typescript
export function lobbyReducer(state: LobbyState, action: LobbyAction): LobbyState {
  switch (action.type) {
    case 'PLAYER_JOINED': {
      if (!state.lobby) return state
      
      const { player, playerCount } = action.payload
      
      // ✅ IMMUTABILITÉ: Créer NOUVEAU tableau
      const updatedPlayers = [...state.lobby.players, player]
      
      // ✅ IMMUTABILITÉ: Créer NOUVEL objet
      return {
        ...state,                    // Copier state
        lobby: {
          ...state.lobby,            // Copier lobby
          players: updatedPlayers,   // ✅ Nouveau tableau!
          currentPlayers: playerCount,
        },
      }
    }
    
    case 'PLAYER_LEFT': {
      if (!state.lobby) return state
      
      const { playerUuid } = action.payload
      
      // ✅ Filter crée automatiquement nouveau tableau
      const updatedPlayers = state.lobby.players.filter(
        (p) => p.uuid !== playerUuid
      )
      
      return {
        ...state,
        lobby: {
          ...state.lobby,
          players: updatedPlayers,  // ✅ Nouveau tableau!
        },
      }
    }
  }
}
```

### 3. **Action Creators** (Helper Functions)

```typescript
export const lobbyActions = {
  playerJoined: (player: any, playerCount: number): LobbyAction => ({
    type: 'PLAYER_JOINED',
    payload: { player, playerCount },
  }),
  
  playerLeft: (playerUuid: string, playerCount: number): LobbyAction => ({
    type: 'PLAYER_LEFT',
    payload: { playerUuid, playerCount },
  }),
}
```

### 4. **Hook avec useReducer**

```typescript
export function useLobbyDetails(lobbyUuid: string | null) {
  // ✅ useReducer au lieu de useState
  const [state, dispatch] = useReducer(lobbyReducer, initialLobbyState)
  
  // Quand événement Transmit arrive:
  useEffect(() => {
    const handlePlayerJoined = (event) => {
      // ✅ Dispatcher l'action au reducer
      dispatch(lobbyActions.playerJoined(event.player, event.playerCount))
    }
    
    transmit.on('lobby.player.joined', handlePlayerJoined)
    return () => transmit.off('lobby.player.joined', handlePlayerJoined)
  }, [])
  
  return {
    lobby: state.lobby,  // ✅ Toujours nouvelle référence quand change
    loading: state.loading,
    error: state.error,
  }
}
```

## 🎯 Avantages du Pattern Reducer

### 1. **Immutabilité Garantie**

```typescript
// AVANT - ❌ Risque de mutation
const updatePlayers = (state) => {
  state.lobby.players.push(newPlayer)  // DANGER!
  return state
}

// APRÈS - ✅ Immutable
case 'PLAYER_JOINED': {
  return {
    ...state,
    lobby: {
      ...state.lobby,
      players: [...state.lobby.players, newPlayer]  // Nouveau tableau!
    }
  }
}
```

### 2. **React Détecte Tous les Changements**

```typescript
// Avec immutabilité:
const oldPlayers = ['alice', 'bob']
const newPlayers = [...oldPlayers, 'charlie']

oldPlayers !== newPlayers  // true → React re-render! ✅
```

### 3. **État Prévisible et Testable**

```typescript
// Test du reducer
const initialState = { lobby: { players: [] } }
const action = lobbyActions.playerJoined({ uuid: '1', name: 'Alice' }, 1)
const newState = lobbyReducer(initialState, action)

expect(newState.lobby.players).toHaveLength(1)
expect(newState.lobby.players[0].name).toBe('Alice')
expect(initialState.lobby.players).toHaveLength(0)  // Original intact!
```

### 4. **Actions Traçables**

```typescript
// Chaque action logguée
case 'PLAYER_JOINED': {
  console.log('📦 LobbyReducer: PLAYER_JOINED', action.payload)
  // ...
}

// Facile de debug:
// 📦 LobbyReducer: PLAYER_JOINED { player: {...}, playerCount: 2 }
// 📦 LobbyReducer: STATUS_CHANGED { status: "READY" }
// 📦 LobbyReducer: PLAYER_LEFT { playerUuid: "...", playerCount: 1 }
```

### 5. **Pas de Perte de Données**

```typescript
// Avec mutation ❌
state.lobby.players.push(newPlayer)
// Si render interrompu → perte possible

// Avec immutabilité ✅
return { ...state, lobby: { ...state.lobby, players: [...players, newPlayer] } }
// Atomique → pas de perte
```

## 📊 Patterns d'Immutabilité React

### Tableaux

```typescript
// Ajouter
const newArray = [...oldArray, newItem]

// Retirer
const newArray = oldArray.filter(item => item.id !== removeId)

// Modifier
const newArray = oldArray.map(item =>
  item.id === updateId ? { ...item, ...updates } : item
)

// Remplacer élément
const newArray = [
  ...oldArray.slice(0, index),
  newItem,
  ...oldArray.slice(index + 1)
]
```

### Objets

```typescript
// Mettre à jour propriété
const newObj = { ...oldObj, name: 'New Name' }

// Mettre à jour propriété nested
const newObj = {
  ...oldObj,
  user: {
    ...oldObj.user,
    name: 'New Name'
  }
}

// Fusionner avec updates
const newObj = { ...oldObj, ...updates }
```

### Objets Nested Complexes

```typescript
// AVANT - ❌ Mutations nested
state.lobby.players[0].isReady = true

// APRÈS - ✅ Immutabilité complète
return {
  ...state,
  lobby: {
    ...state.lobby,
    players: state.lobby.players.map(player =>
      player.uuid === targetUuid
        ? { ...player, isReady: true }  // ✅ Nouveau player
        : player
    )
  }
}
```

## 🔧 Migration vers Reducer Pattern

### Étape 1: Créer le Reducer

```typescript
// reducers/lobby_reducer.ts
export function lobbyReducer(state, action) {
  switch (action.type) {
    case 'PLAYER_JOINED':
      return { ...state, lobby: { ...state.lobby, players: [...state.lobby.players, action.payload.player] } }
    // ...
  }
}
```

### Étape 2: Remplacer useState par useReducer

```typescript
// AVANT
const [lobby, setLobby] = useState(null)

// APRÈS
const [state, dispatch] = useReducer(lobbyReducer, initialState)
```

### Étape 3: Remplacer Mutations par Dispatches

```typescript
// AVANT
setLobby({ ...lobby, players: [...lobby.players, newPlayer] })

// APRÈS
dispatch(lobbyActions.playerJoined(newPlayer, playerCount))
```

## 🎯 Checklist Immutabilité

Pour chaque modification d'état:

- [ ] ✅ Utilise spread operator `...` pour objets
- [ ] ✅ Crée nouveau tableau au lieu de push/pop
- [ ] ✅ Utilise map/filter pour modifier tableaux
- [ ] ✅ Pas d'assignation directe (`obj.prop = val`)
- [ ] ✅ Pas de mutation de tableau (`arr.push()`, `arr.splice()`)
- [ ] ✅ Reducer retourne TOUJOURS nouvel objet si changement
- [ ] ✅ Actions sont loguées pour debug
- [ ] ✅ Tests vérifient que original reste intact

## 📚 Exemple Complet

```typescript
// 1. Définir types d'actions
type Action =
  | { type: 'PLAYER_JOINED'; payload: { player: Player } }
  | { type: 'PLAYER_LEFT'; payload: { playerUuid: string } }

// 2. Créer reducer
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'PLAYER_JOINED':
      return {
        ...state,
        players: [...state.players, action.payload.player]
      }
    case 'PLAYER_LEFT':
      return {
        ...state,
        players: state.players.filter(p => p.uuid !== action.payload.playerUuid)
      }
    default:
      return state
  }
}

// 3. Utiliser dans composant
function LobbyComponent() {
  const [state, dispatch] = useReducer(reducer, initialState)
  
  const handlePlayerJoin = (player) => {
    dispatch({ type: 'PLAYER_JOINED', payload: { player } })
  }
  
  return <PlayerList players={state.players} />
}
```

## 🚀 Résultat

Avec le pattern Reducer + Immutabilité:

✅ **Pas de perte de données**
✅ **React détecte tous les changements**
✅ **État prévisible et testable**
✅ **Actions traçables pour debug**
✅ **Performance optimisée** (React.memo fonctionne)
✅ **Code maintenable et évolutif**

Les tableaux sont maintenant gérés **proprement** et React est **content** ! 🎉
