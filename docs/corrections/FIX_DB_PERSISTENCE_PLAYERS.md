# ✅ Fix Persistence Joueurs - Suppression en DB

**Date:** 13 novembre 2025 - 00:40  
**Status:** ✅ **CORRIGÉ**

---

## 🐛 Problème

### Symptômes
1. **User leave mais reste en DB** - Après F5, le joueur qui a quitté apparaît toujours
2. **Erreur "No players to remove"** - Le leave échoue parfois
3. **Inconsistance DB ↔ Aggregate** - L'aggregate est correct mais la DB non

### Logs Serveur
```
ERROR: Failed to leave lobby
  error: "No players to remove"
```

### Cause Racine
Le repository `save()` **ajoutait/mettait à jour** les joueurs mais **ne supprimait JAMAIS** les joueurs qui avaient quitté le lobby.

```typescript
// AVANT - Problème
for (const player of newPlayers) {
  // Ajoute ou met à jour le joueur
  await playerModel.save()
}
// ❌ Pas de suppression des joueurs qui ont quitté !

return Result.ok(aggregate)
```

**Résultat:** Les joueurs qui quittent restent dans la table `players` en DB.

---

## ✅ Solution

### Repository save() Corrigé

**Logique:**
1. Ajouter/Mettre à jour les joueurs de l'aggregate
2. **Supprimer** les joueurs en DB qui ne sont plus dans l'aggregate

```typescript
// APRÈS - Corrigé
const newPlayers = aggregate.playersList
const newPlayerUserIds = new Set<string>()

// 1. Add/Update players from aggregate
for (const player of newPlayers) {
  const playerUser = await UserModel.findBy('userUuid', player.userId)
  if (!playerUser) {
    return Result.fail(`Player user with UUID ${player.userId} not found`)
  }

  newPlayerUserIds.add(player.userId)  // ✅ Track qui devrait être en DB

  // Save or update player
  let playerModel = await PlayerModel.query()
    .where('lobby_id', model.id)
    .where('user_id', playerUser.id)
    .first()

  if (!playerModel) {
    playerModel = new PlayerModel()
  }

  playerModel.userId = playerUser.id
  playerModel.username = player.username
  playerModel.lobbyId = model.id
  playerModel.isReady = player.isReady
  playerModel.isOwner = player.isOwner

  await playerModel.save()
}

// 2. Delete players that are no longer in the aggregate (left the lobby)
const existingPlayers = await PlayerModel.query().where('lobby_id', model.id)

for (const existingPlayer of existingPlayers) {
  const user = await UserModel.find(existingPlayer.userId)
  if (!user) continue

  // If this player is not in the aggregate anymore, delete them
  if (!newPlayerUserIds.has(user.userUuid)) {
    await existingPlayer.delete()  // ✅ Supprime de la DB
  }
}
```

---

## 🔄 Flux Complet

### Leave Lobby

```
1. User B clique "Leave"
   ↓
2. POST /api/v1/lobbies/:uuid/leave
   ↓
3. LeaveLobbyHandler
   ↓
4. aggregate.removePlayer(userId)
   - Retire B de this.players Map ✅
   - Crée PlayerLeftEvent ✅
   ↓
5. repository.save(aggregate)
   - Sauvegarde lobby ✅
   - Met à jour joueurs existants ✅
   - ✅ NOUVEAU: Supprime joueurs qui ne sont plus dans aggregate
   ↓
6. DB maintenant synchronisée avec aggregate ✅
   ↓
7. EventBus.publishAll()
   ↓
8. Frontend reçoit event
   ↓
9. F5 → Données DB correctes ✅
```

---

## 🧪 Test de Vérification

### Scénario
```bash
# 1. User A crée lobby
POST /lobbies { name: "Test" }
→ DB: 1 player (A)

# 2. User B join
POST /lobbies/:uuid/join
→ DB: 2 players (A, B)

# 3. User B leave
POST /api/v1/lobbies/:uuid/leave
→ DB: 1 player (A)  ✅ B supprimé

# 4. F5 sur la page
GET /lobbies/:uuid
→ Affiche: 1 player (A)  ✅ Correct
```

---

## 📊 Comparaison Avant/Après

### Avant le Fix
```sql
-- Après User B leave
SELECT * FROM players WHERE lobby_id = 1;
-- id | lobby_id | user_id | username
-- 1  | 1        | 1       | User A
-- 2  | 1        | 2       | User B  ❌ Toujours là !
```

### Après le Fix
```sql
-- Après User B leave
SELECT * FROM players WHERE lobby_id = 1;
-- id | lobby_id | user_id | username
-- 1  | 1        | 1       | User A  ✅ Seulement A !
```

---

## 🎯 Impact

### ✅ Problèmes Résolus
- Joueurs supprimés de la DB quand ils quittent
- Pas d'inconsistance DB ↔ Aggregate
- F5 affiche les données correctes
- Pas d'erreur "No players to remove"

### ✅ Améliorations
- Synchronisation complète aggregate → DB
- Suppression automatique des joueurs partis
- Source de vérité : Aggregate
- DB reflète toujours l'état de l'aggregate

---

## 📋 Fichiers Modifiés

### lobby_repository.lucid.ts
- ✅ Méthode `save()` complète
- ✅ Track joueurs avec Set
- ✅ Suppression joueurs absents

---

## 🎊 Résultat

**La persistance est maintenant correcte ! 🎉**

- ✅ Join → Ajoute en DB
- ✅ Leave → Supprime de DB
- ✅ Update → Met à jour en DB
- ✅ F5 → Affiche état correct

**Le repository synchronise parfaitement l'aggregate avec la DB !**

---

**Auteur:** Cascade AI  
**Date:** 13 novembre 2025 - 00:40  
**Status:** ✅ **CORRIGÉ**  
**Impact:** Critique - Persistance correcte
