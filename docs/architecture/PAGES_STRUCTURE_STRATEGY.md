# 📁 Stratégie d'Organisation des Pages Inertia

**Date:** 12 novembre 2025  
**Status:** 🎯 **PROPOSITION**

---

## 🎯 Principe Directeur

**Les pages Inertia doivent refléter l'architecture DDD du backend.**

```
Backend (Domaines)          Frontend (Pages)
├── domains/iam/           → pages/auth/
├── domains/lobby/         → pages/lobbies/
├── domains/game_engine/   → pages/games/
└── infrastructure/        → pages/dev/ + pages/errors/
```

---

## 📊 Structure Actuelle (CHAOTIQUE ❌)

```
inertia/pages/
├── auth/                  ✅ OK (domaine IAM)
│   ├── login.tsx
│   └── register.tsx
├── create-lobby.tsx       ❌ Racine (devrait être dans lobbies/)
├── join-lobby.tsx         ❌ Racine (devrait être dans lobbies/)
├── lobbies.tsx            ❌ Racine (devrait être lobbies/index.tsx)
├── lobby.tsx              ❌ Racine (devrait être lobbies/show.tsx)
├── game.tsx               ❌ Racine (devrait être games/show.tsx)
├── lobbies/               ❌ VIDE !
├── home.tsx               ✅ OK (page publique)
├── welcome.tsx            ✅ OK (page publique)
├── transmit_debug.tsx     ⚠️ À déplacer dans dev/
├── dev/                   ✅ OK
└── errors/                ✅ OK
```

---

## ✅ Structure Proposée (ORGANISÉE)

```
inertia/pages/
├── auth/                  (Domaine IAM)
│   ├── login.tsx         → Route: GET /auth/login
│   └── register.tsx      → Route: GET /auth/register
│
├── lobbies/              (Domaine Lobby)
│   ├── index.tsx         → Route: GET /lobbies
│   ├── create.tsx        → Route: GET /lobbies/create
│   ├── show.tsx          → Route: GET /lobbies/:uuid
│   └── join.tsx          → Route: GET /lobbies/join/:code
│
├── games/                (Domaine Game Engine)
│   └── show.tsx          → Route: GET /games/:uuid
│
├── dev/                  (Outils de développement)
│   ├── routes.tsx        → Route: GET /dev/routes
│   └── transmit.tsx      → Route: GET /transmit-debug
│
├── errors/               (Pages d'erreur)
│   ├── not_found.tsx     → 404
│   └── server_error.tsx  → 500
│
├── home.tsx              (Page d'accueil publique)
└── welcome.tsx           (Landing page publique)
```

---

## 📝 Convention de Nommage

### Règle 1 : Index pour les Listes
```typescript
// ✅ BON
pages/lobbies/index.tsx     → GET /lobbies (liste)
pages/games/index.tsx       → GET /games (liste)

// ❌ MAUVAIS
pages/lobbies.tsx           → Pas clair que c'est une liste
pages/lobby-list.tsx        → Redondant
```

### Règle 2 : Show pour les Détails
```typescript
// ✅ BON
pages/lobbies/show.tsx      → GET /lobbies/:uuid (détail)
pages/games/show.tsx        → GET /games/:uuid (détail)

// ❌ MAUVAIS
pages/lobby.tsx             → Pas clair
pages/lobby-detail.tsx      → Redondant
```

### Règle 3 : Actions au Singulier
```typescript
// ✅ BON
pages/lobbies/create.tsx    → GET /lobbies/create
pages/lobbies/join.tsx      → GET /lobbies/join/:code
pages/lobbies/edit.tsx      → GET /lobbies/:uuid/edit

// ❌ MAUVAIS
pages/create-lobby.tsx      → Hors du dossier du domaine
pages/lobby-join.tsx        → Incohérent
```

### Règle 4 : Composants Internes en PascalCase
```typescript
// Pages (render par Inertia)
pages/lobbies/create.tsx    → export default function CreateLobby()

// Composants UI réutilisables
components/LobbyCard.tsx    → export function LobbyCard()
components/PlayerList.tsx   → export function PlayerList()
```

---

## 🔄 Plan de Migration

### Phase 1 : Créer la Structure
```bash
mkdir -p inertia/pages/lobbies
mkdir -p inertia/pages/games
```

### Phase 2 : Déplacer les Fichiers Lobby
```bash
# Liste → index.tsx
mv inertia/pages/lobbies.tsx → inertia/pages/lobbies/index.tsx

# Détail → show.tsx
mv inertia/pages/lobby.tsx → inertia/pages/lobbies/show.tsx

# Création → create.tsx
mv inertia/pages/create-lobby.tsx → inertia/pages/lobbies/create.tsx

# Join → join.tsx
mv inertia/pages/join-lobby.tsx → inertia/pages/lobbies/join.tsx
```

### Phase 3 : Déplacer les Fichiers Game
```bash
# Détail → show.tsx
mv inertia/pages/game.tsx → inertia/pages/games/show.tsx
```

### Phase 4 : Déplacer Dev Tools
```bash
mv inertia/pages/transmit_debug.tsx → inertia/pages/dev/transmit.tsx
```

### Phase 5 : Mettre à Jour les Contrôleurs
```typescript
// Avant
return inertia.render('lobbies')
return inertia.render('create-lobby')
return inertia.render('lobby')

// Après
return inertia.render('lobbies/index')
return inertia.render('lobbies/create')
return inertia.render('lobbies/show')
```

---

## 🎯 Correspondance Backend ↔ Frontend

### Domaine IAM (Identity & Access)
```
Backend                              Frontend
domains/iam/presentation/           pages/auth/
├── controllers/
│   └── auth_controller.ts
│       ├── showLogin()      →      login.tsx
│       ├── showRegister()   →      register.tsx
│       └── me()             →      (API, pas de page)
```

### Domaine Lobby
```
Backend                              Frontend
domains/lobby/presentation/         pages/lobbies/
├── controllers/
│   └── lobbies_controller.ts
│       ├── index()          →      index.tsx
│       ├── showCreateForm() →      create.tsx
│       ├── show()           →      show.tsx
│       └── showJoinByInvite()→     join.tsx
```

### Domaine Game Engine
```
Backend                              Frontend
domains/game_engine/presentation/   pages/games/
├── controllers/
│   └── games_controller.ts
│       └── show()           →      show.tsx
```

---

## ✅ Avantages de Cette Structure

### 1. Cohérence avec le Backend
- Même logique de domaines
- Facile de trouver les pages liées à un domaine
- Facilite la communication équipe backend/frontend

### 2. Scalabilité
```typescript
// Facile d'ajouter de nouvelles pages
pages/lobbies/
├── index.tsx       (liste)
├── create.tsx      (création)
├── show.tsx        (détail)
├── join.tsx        (rejoindre)
├── edit.tsx        (édition) ← Nouveau !
└── settings.tsx    (paramètres) ← Nouveau !
```

### 3. Clarté
```typescript
// On sait immédiatement à quel domaine appartient une page
pages/lobbies/create.tsx  → Domaine Lobby
pages/games/show.tsx      → Domaine Game Engine
pages/auth/login.tsx      → Domaine IAM
```

### 4. Maintenance Facilitée
```typescript
// Besoin de modifier toutes les pages lobby ? 
// → Tout est dans pages/lobbies/

// Bug sur l'authentification ?
// → Tout est dans pages/auth/
```

---

## 🚨 Règles Strictes à Respecter

### ❌ INTERDIT
```typescript
// Pages à la racine (sauf home/welcome/errors)
pages/my-page.tsx                  ❌

// Noms avec tirets pour les domaines
pages/lobby-create.tsx             ❌
pages/game-detail.tsx              ❌

// Dossiers vides
pages/lobbies/  (vide)             ❌
```

### ✅ AUTORISÉ
```typescript
// Pages dans leur domaine
pages/lobbies/create.tsx           ✅
pages/games/show.tsx               ✅

// Pages publiques à la racine
pages/home.tsx                     ✅
pages/welcome.tsx                  ✅

// Utilitaires système
pages/dev/                         ✅
pages/errors/                      ✅
```

---

## 📚 Documentation des Routes

### Format Standard
Chaque page doit avoir un commentaire de documentation :

```typescript
/**
 * Page: Lobbies List
 * Route: GET /lobbies
 * Domain: Lobby
 * Auth: Required
 * Description: Displays the list of available lobbies
 */
export default function LobbiesIndex() {
  // ...
}
```

---

## 🧪 Validation

### Commande de Vérification
```bash
# Vérifier qu'aucune page lobby n'est à la racine
ls inertia/pages/*lobby*.tsx
# Résultat attendu : Aucun fichier

# Vérifier que toutes les pages lobby sont dans lobbies/
ls inertia/pages/lobbies/*.tsx
# Résultat attendu : index.tsx, create.tsx, show.tsx, join.tsx
```

### Checklist de Migration
- [ ] Tous les fichiers lobby dans `pages/lobbies/`
- [ ] Tous les fichiers game dans `pages/games/`
- [ ] Dossier `pages/lobbies/` non vide
- [ ] Contrôleurs mis à jour avec nouveaux chemins
- [ ] Routes testées et fonctionnelles
- [ ] Documentation à jour

---

## 🎯 Prochaines Étapes

1. **Valider cette stratégie** avec l'équipe
2. **Exécuter la migration** (Phase 1-5)
3. **Tester toutes les routes**
4. **Documenter les changements**
5. **Établir cette structure comme standard** pour toute nouvelle page

---

**Cette structure sera la référence officielle pour toute l'application.** 📐

---

**Auteur:** Cascade AI  
**Status:** En attente de validation  
**Impact:** Toutes les pages du projet
