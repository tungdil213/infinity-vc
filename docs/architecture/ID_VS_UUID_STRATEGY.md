# 🔐 Stratégie ID vs UUID - Sécurité et Performance

**Date:** 12 novembre 2025 - 23:25  
**Status:** ✅ **IMPLÉMENTÉ**

---

## 🎯 Objectif

Utiliser **deux identifiants** pour chaque entité :
1. **`id` (integer)** - Primary key interne, pour les relations DB
2. **`uuid` (string)** - Identifiant public, pour l'API et le frontend

---

## 🔒 Pourquoi Cette Approche ?

### Problème avec UUID Seul
```
❌ URLs prévisibles : /lobbies/1, /lobbies/2, /lobbies/3
❌ Leak le nombre d'entités
❌ Leak la date de création (UUIDv1)
❌ Énumération facile
❌ Informations business exposées
```

### Problème avec Integer Seul comme Public ID
```
❌ Révèle le nombre total de lobbies
❌ Révèle le taux de création
❌ Permet l'énumération systématique
❌ Informations compétitives exposées
```

### ✅ Solution : ID Integer (Interne) + UUID (Public)
```
✅ Performance DB maximale (integer PK)
✅ Relations DB rapides (integer FK)
✅ Sécurité API (UUID impossible à deviner)
✅ Pas de leak d'informations business
✅ Énumération impossible
```

---

## 📊 Structure des Tables

### Users
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Interne, pour relations
  user_uuid TEXT UNIQUE NOT NULL,        -- Public, pour API
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  ...
)
```

### Lobbies
```sql
CREATE TABLE lobbies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Interne, pour relations
  uuid TEXT UNIQUE NOT NULL,             -- Public, pour API
  owner_id INTEGER NOT NULL,             -- FK vers users.id
  name TEXT NOT NULL,
  max_players INTEGER DEFAULT 4,
  ...
  FOREIGN KEY (owner_id) REFERENCES users(id)
)
```

### Lobby Players
```sql
CREATE TABLE lobby_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Interne
  user_id INTEGER NOT NULL,              -- FK vers users.id
  lobby_id INTEGER NOT NULL,             -- FK vers lobbies.id
  username TEXT NOT NULL,
  is_ready BOOLEAN DEFAULT FALSE,
  is_owner BOOLEAN DEFAULT FALSE,
  ...
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (lobby_id) REFERENCES lobbies(id)
)
```

---

## 🔧 Implémentation

### Modèles Lucid

#### LobbyModel
```typescript
export default class LobbyModel extends BaseModel {
  @column({ isPrimary: true })
  declare id: number               // ✅ Integer PK (interne)

  @column()
  declare uuid: string             // ✅ UUID (public)

  @column()
  declare ownerId: number          // ✅ FK integer vers users.id

  @column()
  declare name: string

  // ... autres colonnes
}
```

#### PlayerModel
```typescript
export default class PlayerModel extends BaseModel {
  @column({ isPrimary: true })
  declare id: number               // ✅ Integer PK (interne)

  @column()
  declare userId: number           // ✅ FK integer vers users.id

  @column()
  declare lobbyId: number          // ✅ FK integer vers lobbies.id

  @column()
  declare username: string

  // ... autres colonnes
}
```

---

## 🌐 Utilisation dans l'API

### URLs Publiques (UUID)
```typescript
// ✅ URL publique avec UUID
GET  /api/v1/lobbies/3f9245fc-2afa-47f3-a92f-471a89f9f130
GET  /lobbies/3f9245fc-2afa-47f3-a92f-471a89f9f130

// ❌ JAMAIS exposer les IDs integer
GET  /lobbies/42  // ❌ NE PAS FAIRE
```

### Contrôleurs
```typescript
// Recevoir UUID, chercher par UUID
async show({ params }: HttpContext) {
  const uuid = params.uuid  // ✅ UUID depuis l'URL
  
  // Chercher par UUID
  const lobby = await LobbyModel.findBy('uuid', uuid)
  
  // Retourner UUID
  return response.ok({
    uuid: lobby.uuid,  // ✅ UUID exposé
    // id: lobby.id,   // ❌ JAMAIS exposer l'ID integer
    name: lobby.name,
    ...
  })
}
```

---

## 🔄 Relations et Jointures

### Performance Optimale
```typescript
// ✅ Jointures sur integer (rapide)
const lobbies = await Database
  .from('lobbies')
  .join('users', 'lobbies.owner_id', 'users.id')  // ✅ Integer join
  .select('lobbies.uuid', 'users.user_uuid')     // Exposer UUIDs
```

### Eager Loading
```typescript
// ✅ Relations sur integer PK/FK
const lobby = await LobbyModel.query()
  .where('uuid', params.uuid)
  .preload('players')  // Utilise lobbyId (integer) en interne
```

---

## 📋 Mapping Interne ↔ Public

### Backend → Frontend
```typescript
// Mapper pour exposer seulement les UUIDs
function toLobbyDTO(lobbyModel: LobbyModel) {
  return {
    uuid: lobbyModel.uuid,           // ✅ Public
    name: lobbyModel.name,
    owner: {
      uuid: lobbyModel.owner.userUuid,  // ✅ Public
      fullName: lobbyModel.owner.fullName,
    },
    players: lobbyModel.players.map(p => ({
      uuid: p.user.userUuid,        // ✅ Public
      username: p.username,
    })),
    // JAMAIS exposer id, ownerId, userId (integers)
  }
}
```

### Frontend → Backend
```typescript
// Frontend envoie toujours des UUIDs
const response = await fetch(`/api/v1/lobbies/${lobby.uuid}/join`, {
  method: 'POST',
  body: JSON.stringify({
    userUuid: currentUser.uuid,  // ✅ UUID
  })
})
```

---

## 🛡️ Sécurité

### Protection des Informations
```
✅ Impossible de deviner le nombre total de lobbies
✅ Impossible d'énumérer tous les lobbies
✅ Impossible de déduire le taux de création
✅ Pas d'informations business exposées
✅ Protection contre le scraping
```

### Exemple Attaque Prévenue
```typescript
// ❌ Avec integer exposé :
for (let i = 1; i <= 1000; i++) {
  fetch(`/lobbies/${i}`)  // Énumération facile
}

// ✅ Avec UUID :
fetch(`/lobbies/random-uuid`)  // Impossible à deviner
// Devrait essayer 2^122 combinaisons (impossible)
```

---

## ⚡ Performance

### Comparaison

| Aspect | Integer PK | UUID PK | Integer + UUID |
|--------|------------|---------|----------------|
| **Taille PK** | 4 bytes | 36 bytes | 4 bytes PK + 36 bytes indexed |
| **Index size** | Petit ✅ | Grand ❌ | Petit PK ✅ |
| **JOIN speed** | Très rapide ✅ | Moyen ❌ | Très rapide ✅ |
| **INSERT speed** | Très rapide ✅ | Rapide | Très rapide ✅ |
| **Sécurité** | Faible ❌ | Excellente ✅ | Excellente ✅ |

### Résultat
```
✅ Performance DB maximale (integer PK/FK)
✅ Sécurité maximale (UUID public)
✅ Meilleur des deux mondes
```

---

## 🎯 Règles d'Utilisation

### ✅ À FAIRE

1. **Toujours utiliser UUID dans les URLs**
   ```typescript
   router.get('/lobbies/:uuid', '...')
   ```

2. **Toujours chercher par UUID depuis l'API**
   ```typescript
   const lobby = await LobbyModel.findBy('uuid', params.uuid)
   ```

3. **Relations DB avec integer**
   ```typescript
   lobby.ownerId = user.id  // ✅ Integer
   ```

4. **Exposer uniquement les UUIDs**
   ```typescript
   return { uuid: lobby.uuid, ownerUuid: user.userUuid }
   ```

### ❌ À ÉVITER

1. **JAMAIS exposer les IDs integer**
   ```typescript
   return { id: lobby.id }  // ❌ NE PAS FAIRE
   ```

2. **JAMAIS utiliser integer dans les URLs publiques**
   ```typescript
   router.get('/lobbies/:id', '...')  // ❌ NE PAS FAIRE
   ```

3. **JAMAIS faire des relations avec UUID**
   ```typescript
   lobby.ownerUuid = user.userUuid  // ❌ Performance
   ```

---

## 📝 Convention de Nommage

### Base de Données
```sql
-- Integer PK (interne)
id INTEGER PRIMARY KEY

-- UUID (public)
uuid TEXT UNIQUE NOT NULL        -- Pour lobbies, games
user_uuid TEXT UNIQUE NOT NULL   -- Pour users

-- Foreign Keys (integer)
owner_id INTEGER                 -- FK vers users.id
lobby_id INTEGER                 -- FK vers lobbies.id
user_id INTEGER                  -- FK vers users.id
```

### Modèles Lucid (camelCase)
```typescript
id: number              // Integer PK
uuid: string            // UUID public
ownerId: number         // FK integer
lobbyId: number         // FK integer
userId: number          // FK integer
```

### DTOs Frontend (camelCase)
```typescript
uuid: string            // ✅ TOUJOURS UUID
ownerUuid: string       // ✅ TOUJOURS UUID
// JAMAIS id, ownerId, userId (integers)
```

---

## 🎊 Avantages Finaux

### Pour la Sécurité
```
✅ Zéro leak d'informations business
✅ Énumération impossible
✅ Scraping très difficile
✅ Protection de la vie privée
```

### Pour la Performance
```
✅ Jointures ultra-rapides (integer)
✅ Index compacts (integer PK)
✅ Inserts rapides (auto-increment)
✅ Cache DB efficace
```

### Pour l'UX
```
✅ URLs propres et impossibles à deviner
✅ Pas de numéros séquentiels visibles
✅ Professionnalisme
```

---

## 🚀 Conclusion

**Cette architecture offre le meilleur des deux mondes :**

- ✅ **Performance DB maximale** avec integer PK/FK
- ✅ **Sécurité maximale** avec UUID public
- ✅ **Conformité GDPR** (pas de leak d'infos)
- ✅ **Best practice** de l'industrie

C'est la stratégie utilisée par :
- GitHub (integer ID interne, UUID pour API)
- Stripe (integer + public IDs)
- AWS (integer + ARNs)

**Le projet Infinity suit maintenant les meilleures pratiques de sécurité ! 🔐**

---

**Auteur:** Cascade AI  
**Date:** 12 novembre 2025 - 23:25  
**Status:** ✅ **IMPLÉMENTÉ ET DOCUMENTÉ**  
**Impact:** Sécurité critique + Performance optimale
