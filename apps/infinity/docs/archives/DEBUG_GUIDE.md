# 🔍 Guide de Debug - Système Temps Réel Lobbies

## 🎯 Problème Actuel

**Symptôme**: L'affichage n'est pas bon après événements Transmit
- ✅ Événements arrivent correctement
- ✅ Reducer met à jour l'état (`SET_LOBBY`)
- ❌ Composant affiche "No lobby to display"

## 📊 Flux de Données Complet

```
Backend Event 
  ↓
Transmit SSE
  ↓
TransmitManager (📡 TransmitManager: 📨 Message received)
  ↓
LobbyService (📡 LobbyService: Événement reçu)
  ↓
LobbyContext (📡 LobbyProvider: Mise à jour des détails)
  ↓
useLobbyDetails Hook (🎯 useLobbyDetails: Mise à jour)
  ↓
Reducer (📦 LobbyReducer: SET_LOBBY)
  ↓
React Re-render
  ↓
LobbyStatusSidebar (🔧 LobbyStatusSidebar: Rendering)
```

## 🐛 Logs de Debug Ajoutés

### 1. Layout (🏠)
```javascript
🏠 Layout: Props debug
{
  hasCurrentLobby: boolean,
  lobbyUuid: string,
  hasCurrentUser: boolean,
  userUuid: string
}
```

### 2. LobbyStatusSidebar (🔧)

**Initialisation**:
```javascript
🔧 LobbyStatusSidebar: Initializing component
{
  hasInitialLobby: boolean,
  initialLobbyUuid: string,
  initialLobbyPlayers: number,
  hasCurrentUser: boolean,
  currentUserUuid: string
}
```

**État interne**:
```javascript
🔧 LobbyStatusSidebar: State debug
{
  hasRealtimeLobby: boolean,
  realtimeLobbyPlayers: number,
  hasLastValidLobby: boolean,
  lastValidLobbyPlayers: number,
  loading: boolean,
  hasError: boolean
}
```

**Cache update**:
```javascript
🔧 LobbyStatusSidebar: Updating lastValidLobby
{
  hasRealtimeLobby: boolean,
  hasInitialLobby: boolean
}
```

**Lobby effectif**:
```javascript
🔧 LobbyStatusSidebar: Effective lobby
{
  hasEffectiveLobby: boolean,
  effectiveLobbyUuid: string,
  effectiveLobbyPlayers: number,
  source: 'realtime' | 'cache' | 'none'
}
```

**Rendering final**:
```javascript
// Si pas de lobby
🔧 LobbyStatusSidebar: ❌ No lobby to display
{
  checkedRealtime: boolean,
  checkedCache: boolean,
  checkedInitial: boolean
}

// Si lobby OK
🔧 LobbyStatusSidebar: ✅ Rendering with lobby
{
  uuid: string,
  playersCount: number,
  players: 'alice, bob'
}
```

### 3. Reducer (📦)
```javascript
📦 LobbyReducer: SET_LOBBY
{ uuid, currentPlayers, maxPlayers, canStart, status }
```

### 4. Hook useLobbyDetails (🎯)
```javascript
🎯 useLobbyDetails: Mise à jour depuis le contexte
{ lobby, loading, error }
```

## 🔍 Checklist de Debug

Quand un événement arrive, vérifier dans l'ordre:

### ✅ 1. Événement Reçu?
```
📡 TransmitManager: 📨 Message received on lobbies/xxx
```
- Si absent → Problème connexion Transmit
- Si présent → Passer à 2

### ✅ 2. Service Traite?
```
📡 LobbyService: Événement reçu sur canal lobbies/xxx
📡 LobbyService: Traitement événement lobby.player.left
```
- Si absent → Problème subscription
- Si présent → Passer à 3

### ✅ 3. Context Notifie?
```
📡 LobbyProvider: Mise à jour des détails du lobby xxx
```
- Si absent → Problème dans LobbyService.updateLobbyDetail
- Si présent → Passer à 4

### ✅ 4. Hook Reçoit?
```
🎯 useLobbyDetails: Mise à jour depuis le contexte pour xxx
```
- Si absent → Problème polling (attendre 100ms)
- Si présent → Passer à 5

### ✅ 5. Reducer Applique?
```
📦 LobbyReducer: SET_LOBBY
{ uuid, currentPlayers, ... }
```
- Si absent → Problème dispatch
- Si présent → Passer à 6

### ⚠️ 6. Composant Affiche?

**Cas A - Props Manquantes**:
```javascript
🏠 Layout: Props debug
{ hasCurrentLobby: false }  // ← Problème backend Inertia!
```
**Solution**: Vérifier que le backend envoie `currentLobby` dans Inertia props

**Cas B - InitialLobby Null**:
```javascript
🔧 LobbyStatusSidebar: Initializing component
{ hasInitialLobby: false }  // ← Pas de données initiales!
```
**Solution**: Vérifier que `initialLobby` est passé depuis Layout

**Cas C - Polling Delay**:
```javascript
🔧 LobbyStatusSidebar: State debug
{ hasRealtimeLobby: false, loading: true }  // ← En attente polling
```
**Solution**: Attendre 100ms, si persiste → problème polling

**Cas D - Cache Vide**:
```javascript
🔧 LobbyStatusSidebar: Effective lobby
{ source: 'none' }  // ← Aucune source de données!
```
**Solution**: Vérifier flux complet depuis étape 1

**Cas E - Rendering OK**:
```javascript
🔧 LobbyStatusSidebar: ✅ Rendering with lobby
{ uuid: '...', playersCount: 2 }
```
**Solution**: Tout fonctionne! ✨

## 🎯 Scénarios de Test

### Test 1: Player Joins
1. **Ouvrir** `/lobbies/:uuid` dans onglet A
2. **Autre onglet B**: Rejoindre même lobby
3. **Observer logs onglet A**:

```javascript
// Étape 1: Événement arrive
📡 TransmitManager: 📨 Message received
  type: "lobby.player.joined"
  player: { uuid, nickName }
  playerCount: 2

// Étape 2: Service traite
📡 LobbyService: Événement reçu sur canal lobbies/xxx
📡 LobbyService: handleLobbyPlayerJoined

// Étape 3: Context notifie
📡 LobbyProvider: Mise à jour des détails

// Étape 4: Hook reçoit (max 100ms de délai)
🎯 useLobbyDetails: Mise à jour depuis le contexte

// Étape 5: Reducer applique
📦 LobbyReducer: SET_LOBBY
  currentPlayers: 2

// Étape 6: UI update
🔧 LobbyStatusSidebar: ✅ Rendering with lobby
  playersCount: 2
  players: 'alice, bob'
```

**Résultat attendu**: Le nouveau joueur apparaît dans l'UI sans refresh!

### Test 2: Player Leaves
Même flux avec `lobby.player.left`

**Résultat attendu**: Le joueur disparaît de l'UI sans refresh!

### Test 3: Status Change
Flux avec `lobby.status.changed`

**Résultat attendu**: Le status change dans l'UI sans refresh!

## 🔧 Corrections Effectuées

### 1. ❌ Props Incorrectes dans Layout
**AVANT**:
```typescript
<LobbyStatusSidebar currentLobby={currentLobby} />
```
**Erreur**: Le composant attend `initialLobby` + `currentUser`, pas `currentLobby`

**APRÈS**:
```typescript
<LobbyStatusSidebar initialLobby={currentLobby} currentUser={currentUser} />
```

### 2. ✅ Logs de Debug Détaillés
Ajouté logs à chaque étape pour tracer le flux complet:
- 🏠 Layout
- 🔧 LobbyStatusSidebar
- 🎯 useLobbyDetails
- 📦 LobbyReducer
- 📡 LobbyService
- 📡 TransmitManager

### 3. ✅ Reducer Pattern
Gestion immutable des tableaux pour éviter perte de données

## 🚀 Prochaines Étapes

### 1. Tester avec Logs Activés
```bash
# Ouvrir console DevTools
# Filtrer par emoji: 🏠 🔧 🎯 📦 📡

# Test player join
# Vérifier chaque étape du flux
```

### 2. Identifier l'Étape qui Échoue
Utiliser la checklist ci-dessus pour trouver où ça bloque

### 3. Solutions par Problème

**Si étape 1-2 manquent** → Problème Transmit
- Vérifier connexion TransmitManager
- Vérifier subscription au bon canal

**Si étape 3-4 manquent** → Problème LobbyService
- Vérifier que `updateLobbyDetail` est appelé
- Vérifier que des callbacks sont enregistrés

**Si étape 5 manque** → Problème polling/dispatch
- Vérifier que polling tourne (100ms)
- Vérifier que dispatch est appelé

**Si étape 6 manque** → Problème props/render
- Vérifier `initialLobby` non null
- Vérifier `effectiveLobby` calculé correctement

## 📊 Diagramme de Flux

```
┌─────────────────────────────────────────┐
│  Backend Event: lobby.player.joined     │
└──────────────┬──────────────────────────┘
               ↓
┌──────────────────────────────────────────┐
│  📡 TransmitManager                      │
│  - Reçoit via SSE                        │
│  - Log: Message received                 │
└──────────────┬───────────────────────────┘
               ↓
┌──────────────────────────────────────────┐
│  📡 LobbyService                         │
│  - handleLobbyPlayerJoined()             │
│  - updateLobbyDetail()                   │
│  - Log: Événement reçu                   │
└──────────────┬───────────────────────────┘
               ↓
┌──────────────────────────────────────────┐
│  📡 LobbyContext                         │
│  - Notifie callbacks enregistrés         │
│  - Log: Mise à jour des détails          │
└──────────────┬───────────────────────────┘
               ↓
         [Polling 100ms]
               ↓
┌──────────────────────────────────────────┐
│  🎯 useLobbyDetails Hook                 │
│  - Poll LobbyContext                     │
│  - Détecte changement                    │
│  - Log: Mise à jour depuis contexte      │
└──────────────┬───────────────────────────┘
               ↓
┌──────────────────────────────────────────┐
│  📦 Reducer                              │
│  - dispatch(lobbyActions.setLobby())     │
│  - Crée nouvel état immutable            │
│  - Log: SET_LOBBY                        │
└──────────────┬───────────────────────────┘
               ↓
┌──────────────────────────────────────────┐
│  🔧 LobbyStatusSidebar                   │
│  - Reçoit nouveau state                  │
│  - Calcule effectiveLobby               │
│  - Re-render React                       │
│  - Log: Rendering with lobby             │
└──────────────────────────────────────────┘
               ↓
        🎉 UI Updated!
```

## 💡 Tips de Debug

### 1. Filtrer Console par Emoji
```javascript
// Dans console DevTools
🏠  // Layout
🔧  // Composants
🎯  // Hooks
📦  // Reducer
📡  // Services/Manager
```

### 2. Breakpoints Stratégiques
```typescript
// Dans LobbyStatusSidebar
console.log('🔧 BREAKPOINT 1: initialLobby', initialLobby)
console.log('🔧 BREAKPOINT 2: realtimeLobby', realtimeLobby)
console.log('🔧 BREAKPOINT 3: effectiveLobby', effectiveLobby)
```

### 3. Vérifier État React DevTools
- Ouvrir React DevTools
- Chercher `LobbyStatusSidebar` dans arbre
- Inspecter props et state
- Vérifier `effectiveLobby` a des données

### 4. Timing Issues
Si polling semble lent:
```typescript
// Réduire temporairement pour debug
const pollInterval = setInterval(() => { ... }, 50) // 50ms au lieu de 100ms
```

## ✅ Résultat Attendu Final

Après corrections, les logs doivent montrer:

```javascript
📡 TransmitManager: 📨 Message received
📡 LobbyService: Événement reçu
📡 LobbyProvider: Mise à jour des détails
🎯 useLobbyDetails: Mise à jour depuis le contexte
📦 LobbyReducer: SET_LOBBY
🔧 LobbyStatusSidebar: ✅ Rendering with lobby
  playersCount: 2
  players: 'alice, bob'
```

**Sans aucun** "No lobby to display" ! 🎉
