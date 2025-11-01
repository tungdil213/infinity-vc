# 🔧 Refactoring: Backend as Source of Truth

## ✅ Principe Appliqué Partout

**Backend envoie l'état COMPLET → Frontend remplace simplement**

## 📋 Checklist de Vérification

### ✅ Backend: TransmitEventBridge

- [x] **lobby.created** 
  - Envoie: `players: [creator]`, `createdAt`, `status`, `canStart`, etc.
  - Ligne 106-128 de `transmit_event_bridge.ts`
  
- [x] **lobby.player.joined**
  - Envoie: `lobby.players: [...]` (liste complète)
  - Ligne 130-145 de `transmit_event_bridge.ts`
  
- [x] **lobby.player.left**
  - Envoie: `lobby.players: [...]` (liste complète)
  - Ligne 130-145 de `transmit_event_bridge.ts`
  
- [x] **lobby.status.changed**
  - Pas besoin de `players` (juste status)
  - Ligne 148-155 de `transmit_event_bridge.ts`
  
- [x] **lobby.deleted**
  - Pas besoin de `players` (lobby supprimé)
  - Ligne 157-162 de `transmit_event_bridge.ts`

### ✅ Backend: Use Cases

- [x] **JoinLobbyUseCase**
  - Envoie `lobbyState.players` complet
  - Ligne 80-97 de `join_lobby_use_case.ts`
  
- [x] **LeaveLobbyUseCase**
  - Envoie `lobbyState.players` complet
  - Ligne 99-117 de `leave_lobby_use_case.ts`

### ✅ Frontend: LobbyService

- [x] **handleLobbyCreated**
  - Logs détaillés pour vérifier `players`
  - Ligne 165-212 de `lobby_service.ts`
  
- [x] **handleLobbyPlayerJoined**
  - Logs détaillés pour vérifier `players`
  - Remplace avec état complet du backend
  - Ligne 238-295 de `lobby_service.ts`
  
- [x] **handleLobbyPlayerLeft**
  - Logs détaillés pour vérifier `players`
  - Remplace avec état complet du backend
  - Ligne 297-370 de `lobby_service.ts`
  
- [ ] **Simplifier fallbacks** (optionnel)
  - Supprimer code de fusion complexe devenu inutile
  - Garder juste pour compatibilité temporaire

### 🧪 Tests à Faire

#### Scénario 1: Créer un Lobby
```bash
# Page: /lobbies
1. Créer un lobby "test"
2. Observer logs frontend:
   ✅ handleLobbyCreated
   ✅ hasPlayers: true
   ✅ playersCount: 1
   ✅ players: [{ uuid, nickName }]
3. Vérifier UI: Lobby apparaît avec 1/4 joueurs
```

#### Scénario 2: Rejoindre un Lobby
```bash
# Page: /lobbies/{uuid}
1. Utilisateur 1 crée un lobby
2. Utilisateur 2 rejoint
3. Observer logs des DEUX navigateurs:
   ✅ handleLobbyPlayerJoined
   ✅ hasPlayers: true
   ✅ playersCount: 2
   ✅ players: [user1, user2]
4. Vérifier UI: Les deux voient 2/4 joueurs
5. Vérifier GameLobby: Liste complète des joueurs
6. Vérifier Sidebar: 2/4 joueurs
```

#### Scénario 3: Quitter un Lobby
```bash
# Page: /lobbies/{uuid}
1. 2 utilisateurs dans un lobby
2. Utilisateur 2 quitte
3. Observer logs des DEUX navigateurs:
   ✅ handleLobbyPlayerLeft
   ✅ hasPlayers: true
   ✅ playersCount: 1
   ✅ players: [user1]
4. Vérifier UI:
   - User 1: Voit 1/4 joueurs
   - User 2: Redirigé vers /lobbies
```

#### Scénario 4: Page Lobbies
```bash
# Page: /lobbies
1. Utilisateur 1 crée lobby A
2. Utilisateur 2 crée lobby B
3. Utilisateur 3 ouvre /lobbies
4. Observer:
   ✅ Voir lobbies A et B
   ✅ Compteurs corrects (1/4, 1/4)
5. Utilisateur 4 rejoint lobby A
6. Observer page /lobbies:
   ✅ Lobby A passe à 2/4
   ✅ Sans rafraîchir la page!
```

## 🎯 Résultat Attendu

Après ce refactoring:

✅ **Page /lobbies**: Mise à jour temps réel quand lobbies créés/rejoints
✅ **Page /lobbies/{uuid}**: Sync parfaite entre tous les joueurs
✅ **Sidebar**: Toujours cohérent avec le lobby actuel
✅ **Pas de désynchronisation**: Impossible (une seule vérité)
✅ **Code simple**: ~60% moins de code de fusion

## 🐛 Debug

Si problème, vérifier dans cet ordre:

1. **Backend logs**
   ```
   ✅ JoinLobbyUseCase: PlayerJoined event published
   ✅ TransmitEventBridge: Successfully broadcasted
   ```

2. **Frontend logs (console)**
   ```
   ✅ TransmitManager: Message received
   ✅ LobbyService: handleLobbyPlayerJoined
   ✅ hasPlayers: true
   ✅ playersCount: 2
   ```

3. **State Transmit**
   - Vérifier que `event.data.lobby.players` existe
   - Si undefined: Bug dans TransmitEventBridge
   - Si vide []: Bug dans Use Case

4. **State Frontend**
   - GameLobby logs: `playersArrayLength`
   - LobbyProvider logs: `lobby`
   - Si différents: Problème de propagation

## 📚 Documentation

- `BACKEND_SOURCE_OF_TRUTH.md`: Explication du principe
- `CLEAN_ARCHITECTURE_PROPOSAL.md`: Migration future vers Zustand
- `ARRAY_EMPTY_BUG_FIX.md`: Problème initial résolu

## 🚀 Prochaines Étapes (Optionnel)

1. **Migration Zustand**: Pour éliminer complètement les désynchronisations
2. **Supprimer fallbacks**: Une fois tests validés
3. **TypeScript strict**: Typer tous les events
4. **Tests automatisés**: E2E avec Playwright
