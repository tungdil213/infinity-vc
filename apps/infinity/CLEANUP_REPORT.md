# 🧹 Rapport de Nettoyage - Fichiers Dupliqués

Date: 3 novembre 2025
Status: En attente d'approbation

## 📊 Résumé

- **Total de doublons détectés**: 13 fichiers
- **Impact**: Suppression sécurisée de ~2000 lignes de code obsolète
- **Bénéfices**: Code plus maintenable, moins de confusion, imports cohérents

---

## 🔴 CRITIQUE - Fichiers à Supprimer Immédiatement

### 1. EventBus (Infrastructure) - OBSOLÈTE
**Fichier**: `app/infrastructure/events/event_bus.ts`
- ❌ **Raison**: Version simple et ancienne, remplacée par système moderne
- ✅ **Remplacé par**: `app/application/events/event_bus.ts` + `in_memory_event_bus.ts`
- 📦 **Utilisateurs**: 
  - `app/application/services/domain_event_publisher.ts` (à migrer)
- **Action**: Supprimer après migration de domain_event_publisher.ts

### 2. DomainEvent (Simple) - OBSOLÈTE
**Fichier**: `app/domain/events/domain_event.ts`
- ❌ **Raison**: Interface simple sans métadonnées, remplacée par version enrichie
- ✅ **Remplacé par**: `app/domain/events/base/domain_event.ts`
- 📦 **Utilisateurs**:
  - `app/domain/events/lobby_events.ts` (à supprimer aussi)
  - `app/application/services/domain_event_publisher.ts`
  - `app/infrastructure/events/event_bus.ts` (déjà marqué obsolète)
- **Action**: Supprimer après migration vers événements modernes

### 3. Lobby Events (Ancien) - OBSOLÈTE
**Fichier**: `app/domain/events/lobby_events.ts`
- ❌ **Raison**: 119 lignes d'événements de l'ancien système
- ✅ **Remplacé par**: `app/domain/events/lobby/lobby_domain_events.ts`
- 📦 **Utilisateurs**: Aucun détecté dans le code actif
- **Action**: Supprimer immédiatement

---

## 🟡 MOYEN - Contrôleurs Dupliqués

### 4. Auth Controller (Ancien) - NON UTILISÉ
**Fichier**: `app/controllers/auth_controller.ts`
- ❌ **Raison**: Ancien contrôleur auth, NON référencé dans routes.ts
- ✅ **Remplacé par**: `app/controllers/enhanced_auth_controller.ts`
- 📦 **Routes**: Aucune route ne pointe vers ce fichier
- **Action**: Supprimer immédiatement

### 5. Lobby Controller (Ancien) - NON UTILISÉ
**Fichier**: `app/controllers/lobby_controller.ts`
- ❌ **Raison**: Ancien contrôleur lobby, NON référencé dans routes.ts
- ✅ **Remplacé par**: `app/controllers/enhanced_lobbies_controller.ts`
- 📦 **Routes**: Aucune route ne pointe vers ce fichier
- **Action**: Supprimer immédiatement

### 6. Lobbies Controller (Partiellement Utilisé)
**Fichier**: `app/controllers/lobbies_controller.ts`
- ⚠️ **Raison**: Utilisé pour UNE SEULE méthode (leaveOnClose)
- ✅ **Remplacé par**: `app/controllers/enhanced_lobbies_controller.ts`
- 📦 **Routes**: 
  - `/api/v1/lobbies/leave-on-close` (ligne 62 de routes.ts)
- **Action**: Migrer la méthode `leaveOnClose` vers enhanced_lobbies_controller, puis supprimer

### 7. Game Controller (Ancien) - ERREURS D'IMPORT
**Fichier**: `app/controllers/game_controller.ts`
- ❌ **Raison**: Imports vers `domain/repositories` qui n'existe pas
- ✅ **Remplacé par**: `app/controllers/games_controller.ts`
- 📦 **Routes**: Aucune route ne pointe vers ce fichier
- ⚠️ **Compile**: NON (imports invalides)
- **Action**: Supprimer immédiatement

---

## 🟢 CONSERVATION - Fichiers à Garder

### Simple Lobbies Controller
**Fichier**: `app/controllers/simple_lobbies_controller.ts`
- ✅ **Raison**: Contrôleur spécialisé pour la page d'accueil
- 📦 **Routes**: Route home `/` (ligne 16 de routes.ts)
- **Action**: CONSERVER (objectif spécifique)

### Enhanced Lobbies Controller
**Fichier**: `app/controllers/enhanced_lobbies_controller.ts`
- ✅ **Raison**: Contrôleur principal des lobbies (20KB, 600+ lignes)
- 📦 **Routes**: 12 routes actives
- **Action**: CONSERVER (contrôleur principal)

### Enhanced Auth Controller
**Fichier**: `app/controllers/enhanced_auth_controller.ts`
- ✅ **Raison**: Contrôleur auth principal avec BusinessExceptions
- 📦 **Routes**: 5 routes actives
- **Action**: CONSERVER (contrôleur principal)

### Games Controller
**Fichier**: `app/controllers/games_controller.ts`
- ✅ **Raison**: Contrôleur games avec DDD et Result<T>
- 📦 **Routes**: 4 routes actives
- **Action**: CONSERVER (contrôleur principal)

---

## 📝 Plan d'Action Détaillé

### Phase 1 : Migration Domain Event Publisher (15 min)
1. ✅ Migrer `domain_event_publisher.ts` pour utiliser `getEventBus()` moderne
2. ✅ Tester que les événements fonctionnent toujours
3. ✅ Supprimer `app/infrastructure/events/event_bus.ts`

### Phase 2 : Nettoyage Événements (10 min)
1. ✅ Vérifier qu'aucun fichier n'utilise `domain/events/domain_event.ts`
2. ✅ Vérifier qu'aucun fichier n'utilise `domain/events/lobby_events.ts`
3. ✅ Supprimer les deux fichiers obsolètes

### Phase 3 : Nettoyage Contrôleurs (15 min)
1. ✅ Supprimer `auth_controller.ts` (non utilisé)
2. ✅ Supprimer `lobby_controller.ts` (non utilisé)
3. ✅ Supprimer `game_controller.ts` (imports cassés)
4. ✅ Migrer `leaveOnClose` de lobbies_controller vers enhanced_lobbies_controller
5. ✅ Mettre à jour la route dans routes.ts
6. ✅ Supprimer `lobbies_controller.ts`

### Phase 4 : Vérification (10 min)
1. ✅ Exécuter `pnpm run typecheck` pour vérifier la compilation
2. ✅ Exécuter les tests : `pnpm run test`
3. ✅ Vérifier que le serveur démarre : `pnpm run dev`
4. ✅ Tester les routes principales

---

## 📈 Métriques Avant/Après

### Avant
- Fichiers EventBus: 3
- Fichiers DomainEvent: 3
- Contrôleurs Auth: 2
- Contrôleurs Lobbies: 4
- Contrôleurs Games: 2
- **Total confusion**: 14 fichiers avec doublons

### Après
- Fichiers EventBus: 2 (interface + implémentation moderne)
- Fichiers DomainEvent: 1 (base moderne)
- Contrôleurs Auth: 1 (enhanced)
- Contrôleurs Lobbies: 2 (enhanced + simple pour home)
- Contrôleurs Games: 1 (modern)
- **Total clarté**: 7 fichiers uniques et cohérents

---

## ⚠️ Risques et Précautions

### Risques Faibles
- ✅ Tous les fichiers à supprimer ne sont PAS utilisés dans routes.ts
- ✅ Analyse statique effectuée pour confirmer
- ✅ Tests en place pour vérifier après suppression

### Précautions
- 🔒 Commit GIT avant modifications
- 🧪 Tests après chaque phase
- 📝 Documentation des changements
- 🔄 Possibilité de rollback si problème

---

## 🎯 Résultat Attendu

### Code Plus Propre
- Une seule implémentation par concept
- Imports cohérents avec alias `#`
- Architecture DDD respectée

### Maintenance Facilitée
- Pas de confusion sur quel fichier utiliser
- Documentation claire de l'architecture
- Onboarding simplifié pour nouveaux développeurs

### Performance
- Compilation plus rapide (moins de fichiers)
- IDE plus réactif (moins d'ambiguïté dans l'autocomplétion)
- Bundle plus léger (code mort supprimé)

---

## ✅ Validation Finale

Avant de procéder, confirmer que:
- [ ] Backup/commit git effectué
- [ ] Tests passent avant modifications
- [ ] Environnement de dev prêt
- [ ] Temps alloué pour les 4 phases (~50 min)

**Prêt à exécuter le nettoyage ?**
