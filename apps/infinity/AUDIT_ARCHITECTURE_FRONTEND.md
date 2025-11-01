# 🔍 Audit Architecture Frontend - 1er Novembre 2025

## 🚨 Problèmes Identifiés

### 1. CODE LEGACY / DUPLICATION

#### ❌ Systèmes de Connexion Temps Réel Dupliqués

**PROBLÈME:** Deux systèmes coexistent:
- `SSEContext.tsx` + `use_sse.ts` - **ANCIEN** système SSE
- `TransmitContext.tsx` + `transmit_manager.ts` - **NOUVEAU** système Transmit

**UTILISATION:**
```typescript
// LEGACY - À SUPPRIMER
import { useSSE } from './hooks/use_sse'
const { isConnected } = useSSE()

// ACTUEL - À CONSERVER
import { useTransmit } from './contexts/TransmitContext'
const { isConnected } = useTransmit()
```

**FICHIERS À SUPPRIMER:**
- ❌ `contexts/SSEContext.tsx` (259 lignes)
- ❌ `hooks/use_sse.ts` (6127 bytes)

**IMPACT:** 
- Confusion sur quel système utiliser
- Bug possible: `isConnected` peut venir du mauvais contexte
- Code mort qui prend de la place

---

#### ❌ Doubles Singletons pour LobbyService

**PROBLÈME:** Deux fichiers créent des singletons globaux différents!

**Fichier 1:** `services/lobby_service_singleton.ts` (créé récemment)
```typescript
let globalLobbyService: LobbyService | null = null

export function initializeLobbyService(transmitContext) {
  if (!globalLobbyService && transmitContext) {
    globalLobbyService = new LobbyService(transmitContext)
  }
  return globalLobbyService!
}
```

**Fichier 2:** `hooks/use_lobby_service.ts` (ANCIEN)
```typescript
let globalLobbyService: LobbyService | null = null

export function useLobbyService() {
  const service = useMemo(() => {
    if (globalLobbyService) {
      return globalLobbyService
    }
    globalLobbyService = new LobbyService(transmitContext)
    return globalLobbyService
  }, [transmitContext.isConnected])
}
```

**RÉSULTAT:**
- ⚠️ Deux variables globales avec le MÊME NOM dans des fichiers différents
- ⚠️ Confusion totale sur quel singleton est utilisé
- ⚠️ Possibles bugs difficiles à tracer

**SOLUTION:**
- ✅ Garder uniquement `lobby_service_singleton.ts`
- ❌ Supprimer `use_lobby_service.ts`
- ✅ Utiliser directement `getLobbyService()` partout

---

#### ❌ Composants Dupliqués

**GameLobby vs EnhancedGameLobby:**
- `GameLobby.tsx` (11735 bytes)
- `EnhancedGameLobby.tsx` (13192 bytes)

**QUESTION:** Lequel est utilisé? Les deux ont probablement le même rôle.

**Header vs HeaderWrapper:**
- `Header.tsx` (9190 bytes) - Probablement le vieux
- `HeaderWrapper.tsx` (2144 bytes) - Le wrapper qui utilise le nouveau système

**SOLUTION:** Vérifier lequel est utilisé et supprimer l'autre.

---

### 2. PROBLÈME `isConnected` 

**ROOT CAUSE:** Le `isConnected` vient probablement du mauvais contexte!

```typescript
// Dans HeaderWrapper.tsx
const { isConnected } = useTransmit()
```

**MAIS** si un composant parent utilise encore `useSSE()`, il y a conflit!

**DEBUG NÉCESSAIRE:**
1. Chercher tous les usages de `useSSE()` → Les remplacer par `useTransmit()`
2. Vérifier que `TransmitContext` est bien au-dessus de tout dans l'arbre React
3. Supprimer complètement `SSEContext`

---

### 3. USEEFFECT / USESTATE EXCESSIFS

**Problème:** Trop de state local au lieu d'utiliser la source de vérité serveur.

#### Exemples de Code Potentiellement Problématique:

**❌ State local qui duplique les props Inertia:**
```typescript
// Mauvais - State local alors qu'on a déjà les props Inertia
const [lobbies, setLobbies] = useState(initialLobbies)
```

**✅ Utiliser directement les props ou le hook:**
```typescript
// Bon - Utiliser le hook qui gère déjà l'état
const { lobbies } = useLobbyList({}, initialLobbies)
```

**❌ useEffect qui mute l'état:**
```typescript
// Mauvais - Mutation dans useEffect
useEffect(() => {
  setLobbies(prev => [...prev, newLobby])
}, [newLobby])
```

**✅ Le service gère les mutations:**
```typescript
// Bon - Le service notifie, le hook met à jour
lobbyService.subscribeLobbyList((newState) => {
  setLocalState(newState)
})
```

---

## 📊 Inventaire Complet des Fichiers

### Contexts (3 fichiers)

| Fichier | Statut | Action |
|---------|--------|--------|
| `LobbyContext.tsx` | ✅ ACTIF | Conserver - Utilise le singleton |
| `TransmitContext.tsx` | ✅ ACTIF | Conserver - Nouveau système |
| `SSEContext.tsx` | ❌ LEGACY | **SUPPRIMER** |

### Hooks (6 fichiers)

| Fichier | Statut | Action |
|---------|--------|--------|
| `use_lobby_list.ts` | ✅ ACTIF | Conserver - Utilise le singleton |
| `use_lobby_details.ts` | ✅ ACTIF | Conserver |
| `use_lobby_leave_guard.ts` | ✅ ACTIF | Conserver |
| `use_tab_detection.ts` | ✅ ACTIF | Conserver |
| `use_sse.ts` | ❌ LEGACY | **SUPPRIMER** |
| `use_lobby_service.ts` | ❌ DOUBLON | **SUPPRIMER** (doublon singleton) |

### Composants (9 fichiers)

| Fichier | Statut | Action |
|---------|--------|--------|
| `layout.tsx` | ✅ ACTIF | Conserver |
| `HeaderWrapper.tsx` | ✅ ACTIF | Conserver |
| `LobbyStatusSidebar.tsx` | ✅ ACTIF | Vérifier/Optimiser |
| `AutoLeaveLobby.tsx` | ✅ ACTIF | Conserver |
| `LobbyList.tsx` | ✅ ACTIF | Conserver |
| `toast_handler.tsx` | ✅ ACTIF | Conserver |
| `Header.tsx` | ⚠️ DOUBLON? | **VÉRIFIER** (vs UI package) |
| `GameLobby.tsx` | ⚠️ DOUBLON? | **VÉRIFIER** (vs Enhanced) |
| `EnhancedGameLobby.tsx` | ⚠️ DOUBLON? | **VÉRIFIER** (vs GameLobby) |

### Services (3 fichiers)

| Fichier | Statut | Action |
|---------|--------|--------|
| `lobby_service.ts` | ✅ ACTIF | Conserver |
| `lobby_service_singleton.ts` | ✅ ACTIF | Conserver |
| `transmit_manager.ts` | ✅ ACTIF | Conserver |

---

## 🎯 Plan de Refactoring

### Phase 1: Suppression du Code Legacy (URGENT)

#### Étape 1.1: Supprimer SSE (Ancien Système)
```bash
# Vérifier qu'aucun fichier n'utilise SSEContext
grep -r "useSSE\|SSEContext" apps/infinity/inertia/

# Si utilisé, remplacer par useTransmit
# Puis supprimer
rm apps/infinity/inertia/contexts/SSEContext.tsx
rm apps/infinity/inertia/hooks/use_sse.ts
```

#### Étape 1.2: Supprimer le Doublon Singleton
```bash
# Remplacer tous les usages de use_lobby_service par le singleton
# Dans HeaderWrapper.tsx et autres:
# AVANT:
# const { service } = useLobbyService()

# APRÈS:
# import { getLobbyService } from '../services/lobby_service_singleton'
# const lobbyService = getLobbyService()

# Puis supprimer
rm apps/infinity/inertia/hooks/use_lobby_service.ts
```

#### Étape 1.3: Identifier les Composants Doublons
```bash
# Chercher où GameLobby est utilisé
grep -r "GameLobby\|EnhancedGameLobby" apps/infinity/inertia/pages/

# Chercher où Header est utilisé
grep -r "from.*Header" apps/infinity/inertia/
```

---

### Phase 2: Simplification des useState/useEffect

#### Règles à Suivre:

1. **Source de Vérité = Serveur (Inertia)**
   ```typescript
   // ✅ BON
   export default function Lobbies({ lobbies: initialLobbies }) {
     const { lobbies } = useLobbyList({}, initialLobbies)
     // lobbies vient du hook qui gère Inertia + Transmit
   }
   
   // ❌ MAUVAIS
   const [lobbies, setLobbies] = useState(initialLobbies)
   useEffect(() => {
     // Logique compliquée pour synchroniser...
   }, [])
   ```

2. **Pas de State Local si Props Inertia Suffisent**
   ```typescript
   // ✅ BON
   export default function Profile({ user }) {
     return <div>{user.name}</div>
   }
   
   // ❌ MAUVAIS
   const [localUser, setLocalUser] = useState(user)
   useEffect(() => {
     setLocalUser(user)
   }, [user])
   ```

3. **Pas de Mutation dans le Frontend**
   ```typescript
   // ❌ MAUVAIS
   const handleJoin = () => {
     setLobbies(prev => prev.map(l => 
       l.uuid === lobbyUuid 
         ? { ...l, currentPlayers: l.currentPlayers + 1 }
         : l
     ))
   }
   
   // ✅ BON
   const handleJoin = async () => {
     await lobbyService.joinLobby(lobbyUuid, userId)
     // Le service notifie automatiquement les abonnés
     // L'état est mis à jour via le hook
   }
   ```

---

### Phase 3: Architecture Propre (Recommandation)

#### Option A: Context + Singleton (Actuel Amélioré)

```
Backend (Source de Vérité)
    ↓
Inertia Props (Données initiales)
    ↓
LobbyService Singleton (Gère Transmit)
    ↓
Hooks (useLobbyList, etc.)
    ↓
Components (Affichage)
```

**Avantages:**
- ✅ Déjà implémenté
- ✅ Fonctionne bien
- ✅ Singleton évite les race conditions

**Inconvénients:**
- ⚠️ Context API peut être verbeux
- ⚠️ Difficile à debug avec DevTools

#### Option B: Migration Zustand (Recommandé Long Terme)

```typescript
// lobby_store.ts
import { create } from 'zustand'

export const useLobbyStore = create((set, get) => ({
  // State
  lobbies: [],
  currentLobby: null,
  
  // Actions
  initializeWithInertia: (lobbies) => set({ lobbies }),
  
  addLobby: (lobby) => set((state) => ({
    lobbies: [...state.lobbies, lobby]
  })),
  
  removeLobby: (uuid) => set((state) => ({
    lobbies: state.lobbies.filter(l => l.uuid !== uuid)
  })),
}))

// Dans les composants
export default function Lobbies({ lobbies: initialLobbies }) {
  const { lobbies, initializeWithInertia } = useLobbyStore()
  
  useEffect(() => {
    initializeWithInertia(initialLobbies)
  }, [])
  
  return <LobbyList lobbies={lobbies} />
}
```

**Avantages:**
- ✅ Plus simple que Context
- ✅ DevTools intégrés
- ✅ Performance optimisée
- ✅ Pattern standard reconnu

---

## 🔧 Actions Immédiates

### 1. Fixer `isConnected` (URGENT - 30 min)

```bash
# 1. Chercher tous les usages de SSE
grep -r "useSSE" apps/infinity/inertia/

# 2. Les remplacer par useTransmit
# 3. Tester le Header
```

### 2. Nettoyer les Doublons (1h)

```bash
# 1. Supprimer SSEContext et use_sse
# 2. Supprimer use_lobby_service (doublon)
# 3. Identifier et supprimer GameLobby OU EnhancedGameLobby
# 4. Identifier et supprimer Header OU utiliser uniquement UI package
```

### 3. Optimiser les useEffect/useState (2-3h)

```bash
# 1. Audit de chaque composant
# 2. Supprimer les states locaux inutiles
# 3. Simplifier les useEffect
# 4. Tester que tout fonctionne
```

---

## 📝 Checklist de Validation

### Code Legacy Supprimé
- [ ] SSEContext.tsx supprimé
- [ ] use_sse.ts supprimé
- [ ] use_lobby_service.ts supprimé ou refactorisé
- [ ] Doublons de composants identifiés et supprimés

### Architecture Propre
- [ ] Un seul système temps réel (Transmit)
- [ ] Un seul singleton (lobby_service_singleton.ts)
- [ ] Pas de state local qui duplique Inertia props
- [ ] Pas de mutations dans les composants

### Bugs Fixés
- [ ] `isConnected` fonctionne correctement
- [ ] Pas de conflits entre contexts
- [ ] Transmit se connecte proprement

### Documentation
- [ ] Architecture documentée
- [ ] Décisions techniques expliquées
- [ ] Guide pour futurs développeurs

---

**Date:** 1er novembre 2025  
**Statut:** 🔴 AUDIT INITIAL - ACTION REQUISE  
**Priorité:** HAUTE
