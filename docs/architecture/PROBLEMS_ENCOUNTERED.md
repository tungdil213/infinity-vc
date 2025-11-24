# 📋 Liste Exhaustive des Problèmes Rencontrés

**Date:** 12 novembre 2025  
**Session:** Migration et Corrections Architecturales

---

## 🎯 Catégories de Problèmes

### 1. 🗂️ Structure des Routes

#### Problème 1.1 : Fichiers de Routes Multiples et Contradictoires
**Description:** 3 fichiers de routes différents créant de la confusion
- `app/routes/complete_routes.ts` (ancien système)
- `app/routes/api_routes.ts` (migration partielle jamais finie)
- `app/routes/web.ts` (migration DDD incomplète)
- `/start/routes.ts` (le seul actif)

**Impact:** Impossible de savoir quel fichier est actif, routes manquantes

**Solution:** Archiver les anciens fichiers, n'utiliser que `/start/routes.ts`

---

#### Problème 1.2 : Routes Manquantes dans le Fichier Actif
**Description:** Route `GET /lobbies/create` n'existait pas dans `/start/routes.ts`

**Symptôme:** `Cannot GET:/lobbies/create`

**Solution:** Ajouter toutes les routes manquantes au fichier actif

---

#### Problème 1.3 : Méthodes Incorrectes dans les Routes
**Description:** 
- `POST /lobbies` pointait vers `.create()` au lieu de `.store()`
- `POST /lobbies/:uuid/start` pointait vers `.startGame()` au lieu de `.start()`

**Impact:** Erreurs 404 ou méthodes introuvables

**Solution:** Standardiser les noms de méthodes : `index`, `show`, `store`, `destroy`

---

### 2. 📁 Structure des Pages

#### Problème 2.1 : Pages Sans Organisation Logique
**Description:** Pages éparpillées à la racine sans structure claire
```
pages/
├── create-lobby.tsx       ❌ À la racine
├── join-lobby.tsx         ❌ À la racine
├── lobbies.tsx            ❌ À la racine
├── lobby.tsx              ❌ À la racine
├── game.tsx               ❌ À la racine
├── lobbies/               ❌ VIDE !
```

**Impact:** Confusion, difficulté à trouver les fichiers, pas de cohérence avec le backend

**Solution:** Organiser par domaine DDD : `pages/lobbies/`, `pages/games/`, etc.

---

#### Problème 2.2 : Dossiers Vides
**Description:** Dossier `pages/lobbies/` existait mais était vide

**Impact:** Fausse impression d'organisation, confusion dans la navigation

**Solution:** Supprimer les dossiers vides OU les remplir avec les bonnes pages

---

#### Problème 2.3 : Convention de Nommage Incohérente
**Description:** 
- `lobbies.tsx` vs `lobby.tsx` (liste vs détail?)
- `create-lobby.tsx` (avec tiret) vs d'autres sans tiret
- `transmit_debug.tsx` (avec underscore)

**Impact:** Impossible de savoir ce que fait une page juste avec son nom

**Solution:** Convention stricte : `index.tsx` (liste), `show.tsx` (détail), `create.tsx` (création)

---

#### Problème 2.4 : Pages Dupliquées
**Description:** Deux pages de création :
- `create-lobby.tsx` (complète, avec password/description)
- `lobbies/create.tsx` (simplifiée, créée lors du debug)

**Impact:** Confusion sur quelle page utiliser, fonctionnalités perdues

**Solution:** Garder une seule page, la plus complète

---

### 3. 🎨 Structure des Composants

#### Problème 3.1 : Composants Mélangés entre App et Package UI
**Description:** 
- `apps/infinity/inertia/components/` contient des composants spécifiques ET réutilisables
- `packages/ui/src/components/` contient des composants partagés

**Confusion actuelle:**
```
apps/infinity/inertia/components/
├── HeaderWrapper.tsx         ← Spécifique à Infinity
├── LobbyList.tsx            ← Doublon avec packages/ui
├── GameLobby.tsx            ← Spécifique à Infinity
├── layout.tsx               ← Spécifique à Infinity
├── toast_handler.tsx        ← Spécifique à Infinity

packages/ui/src/components/
├── header.tsx               ← Partagé (bonne place)
├── lobby-list.tsx          ← Partagé (doublon?)
├── lobby-card.tsx          ← Partagé (bonne place)
```

**Impact:** 
- Doublons de code
- Confusion sur quel composant utiliser
- Difficulté à réutiliser dans d'autres apps

**Solution:** 
- **Règle claire:** Composants réutilisables → `packages/ui/`
- **Règle claire:** Composants spécifiques à une app → `apps/{app}/components/`
- Identifier et migrer les composants réutilisables

---

#### Problème 3.2 : Imports Relatifs Cassés Après Migration
**Description:** Après avoir déplacé les pages, les imports sont incorrects
```typescript
// Avant (lobbies.tsx à la racine)
import Layout from '../components/layout'

// Après (lobbies/index.tsx)
import Layout from '../components/layout'  ❌ CASSÉ
import Layout from '../../components/layout' ✅ CORRECT
```

**Impact:** Erreurs de compilation, pages qui ne se chargent pas

**Solution:** Mettre à jour tous les imports après migration de fichiers

---

### 4. 🔧 Contrôleurs et Méthodes

#### Problème 4.1 : Contrôleurs Pointant vers les Mauvaises Pages
**Description:** Après migration des pages, les contrôleurs rendaient les anciens chemins
```typescript
inertia.render('lobbies')       ❌ Cherche pages/lobbies.tsx
inertia.render('lobbies/index') ✅ Correct
```

**Impact:** Erreurs Inertia, pages blanches

**Solution:** Mettre à jour tous les `inertia.render()` après migration

---

#### Problème 4.2 : Méthodes Manquantes dans les Contrôleurs
**Description:** Routes définies mais méthodes non implémentées :
- `showCreateForm()` manquait initialement
- `showJoinByInvite()` référencé mais pas implémenté
- `kickPlayer()` référencé mais pas implémenté

**Impact:** Erreurs "Method not found", 404

**Solution:** Implémenter toutes les méthodes référencées dans les routes

---

#### Problème 4.3 : Nombre d'Arguments Incorrects
**Description:** `CreateLobbyCommand` attendait 6 arguments mais en recevait 7
```typescript
// Incorrect
new CreateLobbyCommand(
  user.userUuid,
  user.fullName,  // ← Argument en trop
  name,
  maxPlayers,
  minPlayers,
  isPrivate,
  gameType
)
```

**Impact:** Erreurs TypeScript, création échoue

**Solution:** Vérifier les signatures de commandes/constructeurs

---

### 5. 🏗️ Architecture DDD

#### Problème 5.1 : Repository Incomplet
**Description:** `LobbyRepositoryLucid` n'implémentait pas la méthode `exists()` requise par l'interface

**Impact:** Erreur TypeScript, contrat d'interface non respecté

**Solution:** Implémenter toutes les méthodes de l'interface

---

#### Problème 5.2 : Fonctionnalités Perdues Lors de Migrations
**Description:** Lors du simplification de la page création :
- ❌ Password protection perdu
- ❌ Description du lobby perdue
- ❌ Validation avancée perdue

**Cause racine:** Le domaine Lobby n'a pas ces champs dans son modèle

**Impact:** Régression fonctionnelle

**Solution:** Ne jamais simplifier sans vérifier le domaine, marquer "Coming Soon" si pas implémenté

---

#### Problème 5.3 : Layout Manquant sur Certaines Pages
**Description:** Page de création sans header/footer lors du debug

**Impact:** Expérience utilisateur cassée

**Solution:** Toujours vérifier que les pages utilisent le Layout

---

### 6. 🔄 Container IoC et Dépendances

#### Problème 6.1 : Repository Non Enregistré
**Description:** `LobbyRepositoryLucid` pas enregistré dans `app_provider.ts`

**Symptôme:** `Cannot resolve dependencies. Did you forget @inject()?`

**Solution:** Enregistrer tous les repositories/services dans le container

---

### 7. 📡 Événements et EventBus

#### Problème 7.1 : Noms d'Événements Incohérents
**Description:** Event publié avec nom `user.logged.in` mais registry attendait `iam.user.logged.in`

**Impact:** Handlers jamais appelés, fonctionnalités silencieusement cassées

**Solution:** Convention stricte de nommage : `{domain}.{entity}.{action}`

---

### 8. 🔐 Authentification et Sécurité

#### Problème 8.1 : Double Hash du Password
**Description:** 
- Seeder hashait le password
- Hook `@beforeSave()` du modèle re-hashait
- Résultat : `hash(hash(password))`

**Impact:** Connexion impossible

**Solution:** Laisser le hook gérer le hash, passer le password en clair au seeder

---

#### Problème 8.2 : Type Mismatch pour auth.login()
**Description:** `auth.login()` attend un modèle Lucid, pas une entité DDD

**Impact:** `RuntimeException: Invalid user object`

**Solution:** Récupérer le modèle Lucid après authentification réussie

---

### 9. 📄 Documentation et Communication

#### Problème 9.1 : Manque de Documentation des Changements
**Description:** Changements faits sans documenter pourquoi/comment

**Impact:** Impossible de comprendre l'historique, erreurs répétées

**Solution:** Créer des fichiers `.md` dans `/docs/` pour chaque changement majeur

---

#### Problème 9.2 : Pas de Checklist de Validation
**Description:** Changements appliqués sans tests systématiques

**Impact:** Bugs découverts tard, régressions

**Solution:** Checklist de validation pour chaque type de changement

---

## 📊 Résumé par Catégorie

| Catégorie | Problèmes | Status |
|-----------|-----------|--------|
| Routes | 3 | ✅ Corrigés |
| Pages | 4 | ✅ Corrigés |
| Composants | 2 | ⏳ En cours |
| Contrôleurs | 3 | ✅ Corrigés |
| Architecture DDD | 3 | ✅ Corrigés |
| IoC Container | 1 | ✅ Corrigé |
| Événements | 1 | ✅ Corrigé |
| Authentification | 2 | ✅ Corrigés |
| Documentation | 2 | ✅ Corrigés |

**Total:** 21 problèmes identifiés

---

## 🎯 Prochains Problèmes à Résoudre

1. **Composants UI** : Clarifier la séparation packages/ui vs apps/infinity/components
2. **Tests manquants** : Ajouter des tests pour éviter les régressions
3. **Validation automatique** : CI/CD pour détecter les problèmes tôt

---

**Ce document doit être mis à jour à chaque nouveau problème découvert.**
