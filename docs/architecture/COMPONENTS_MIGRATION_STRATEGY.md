# 🧩 Stratégie de Migration des Composants

**Date:** 12 novembre 2025  
**Status:** 📋 **ANALYSE COMPLÈTE**

---

## 🎯 Problème Actuel

**Composants mélangés entre deux dossiers :**
- `apps/infinity/inertia/components/` - 7 fichiers
- `packages/ui/src/components/` - 46+ composants primitives + 6 composants métier

**Confusion :**
- Doublons potentiels (LobbyList vs lobby-list)
- Pas de règle claire sur où mettre les nouveaux composants
- Imports relatifs compliqués

---

## 📊 Analyse des Composants Actuels

### apps/infinity/inertia/components/ (7 fichiers)

| Fichier | Type | Dépendances | Migration |
|---------|------|-------------|-----------|
| **layout.tsx** | Layout app | Sonner, TransmitProvider, LobbyProvider | ✅ **RESTER** |
| **toast_handler.tsx** | Handler | Inertia, Sonner | ✅ **RESTER** |
| **HeaderWrapper.tsx** | Wrapper | Header (packages/ui), router, useTransmit, lobbyService | ✅ **RESTER** |
| **LobbyStatusSidebar.tsx** | Sidebar | Hooks métier (useLobbyDetails, useLobbyContext), router | ✅ **RESTER** |
| **AutoLeaveLobby.tsx** | Hook Effect | router, toast, logique métier | ✅ **RESTER** |
| **GameLobby.tsx** | Composant de jeu | Hooks métier, router, toast | ✅ **RESTER** |
| **LobbyList.tsx** | Wrapper | UILobbyList (packages/ui), useLobbyList | ⚠️ **ANALYSER** |

### packages/ui/src/components/ (composants métier)

| Fichier | Type | Description | Status |
|---------|------|-------------|--------|
| **header.tsx** | UI partagé | Header avec dialog | ✅ Bon endroit |
| **footer.tsx** | UI partagé | Footer standard | ✅ Bon endroit |
| **lobby-list.tsx** | UI partagé | Liste de lobbies générique | ✅ Bon endroit |
| **lobby-card.tsx** | UI partagé | Card de lobby générique | ✅ Bon endroit |
| **lobby-status-badge.tsx** | UI partagé | Badge de status | ✅ Bon endroit |
| **player-avatar.tsx** | UI partagé | Avatar de joueur | ✅ Bon endroit |
| **primitives/** | UI primitives | Shadcn/UI | ✅ Bon endroit |

---

## 🎯 Critères de Décision

### ✅ RESTER dans apps/infinity/components/

Un composant DOIT rester dans `apps/infinity/components/` si :

1. **Dépend de la logique métier Infinity**
   - Utilise des hooks spécifiques (`useLobbyDetails`, `useLobbyContext`)
   - Appelle des services applicatifs (`lobbyService`)
   - Utilise le router Inertia avec routes spécifiques

2. **Dépend de contexts spécifiques**
   - `TransmitProvider`
   - `LobbyProvider`
   - Autres contexts applicatifs

3. **Est un Layout ou Handler**
   - Layout principal de l'app
   - Toast handler
   - Auto leave handler

### 🔄 MIGRER vers packages/ui/

Un composant DEVRAIT être dans `packages/ui/` si :

1. **Est générique et réutilisable**
   - Peut être utilisé dans n'importe quelle app
   - Props génériques sans dépendance à Infinity
   - Aucune logique métier

2. **Est purement présentationnel**
   - Reçoit des données en props
   - Émet des événements via callbacks
   - Pas d'appel à des services

3. **Peut être documenté dans Storybook**
   - Tous les états peuvent être simulés
   - Props claires et typées
   - Pas de dépendance externe (sauf React, primitives UI)

---

## 📋 Décision Finale par Composant

### ✅ RESTER dans apps/infinity/components/

#### 1. layout.tsx
**Raison:** Layout spécifique avec providers applicatifs
```typescript
// Dépendances spécifiques Infinity
<TransmitProvider>
  <LobbyProvider>
    <ToastHandler />
    <LobbyStatusSidebar />
    <AutoLeaveLobby />
```
**Décision:** ✅ **RESTER**

---

#### 2. toast_handler.tsx
**Raison:** Handler de toasts pour flash messages Inertia
```typescript
// Convertit flash messages Inertia en toasts Sonner
const { toast: toastData } = usePage().props
```
**Décision:** ✅ **RESTER**

---

#### 3. HeaderWrapper.tsx
**Raison:** Wrapper avec logique métier (lobbyService, TransmitContext)
```typescript
// Logique métier spécifique
const lobbyService = getLobbyService()
const { isConnected } = useTransmit()

const handleJoinByCode = async (code: string) => {
  await lobbyService.joinLobby(code, user.uuid)
  router.visit(`/lobbies/${code}`)
}
```
**Décision:** ✅ **RESTER**

---

#### 4. LobbyStatusSidebar.tsx
**Raison:** Sidebar avec hooks métier (useLobbyDetails, useLobbyContext)
```typescript
// Hooks métier spécifiques
const { lobby, loading } = useLobbyDetails(lobbyUuid)
const { isConnected, subscribe } = useLobbyContext()
const permissions = getLobbyPermissions(lobby, currentUserId)
```
**Décision:** ✅ **RESTER**

---

#### 5. AutoLeaveLobby.tsx
**Raison:** Hook effect avec logique métier (auto-leave sur beforeunload)
```typescript
// Logique métier : quitter le lobby automatiquement
navigator.sendBeacon('/api/v1/lobbies/leave-on-close', ...)
```
**Décision:** ✅ **RESTER**

---

#### 6. GameLobby.tsx
**Raison:** Composant de jeu avec hooks métier
```typescript
// Hooks métier spécifiques
const { lobby, loading } = useLobbyDetails(lobbyUuid)
const { leaveGuard } = useLobbyLeaveGuard(lobbyUuid)
```
**Décision:** ✅ **RESTER**

---

#### 7. LobbyList.tsx
**Raison:** Wrapper avec hooks métier (useLobbyList)
```typescript
// Hook métier spécifique
const { lobbies, isLoading } = useLobbyList({ filters }, initialLobbies)

// Utilise le composant UI générique
<UILobbyList
  lobbies={transformedLobbies}
  onLobbyClick={handleLobbyClick}
  onJoinLobby={handleJoinLobby}
/>
```
**Décision:** ✅ **RESTER** (c'est un wrapper avec logique)

---

## ✅ Déjà Bien Placés dans packages/ui/

### 1. header.tsx
**Type:** Composant UI réutilisable  
**Props:** Génériques (user, onCreateLobby, onJoinByCode)  
**Status:** ✅ **BON ENDROIT**

### 2. footer.tsx
**Type:** Composant UI réutilisable  
**Props:** Aucune dépendance spécifique  
**Status:** ✅ **BON ENDROIT**

### 3. lobby-list.tsx
**Type:** Composant UI réutilisable  
**Props:** Génériques (lobbies, filters, callbacks)  
**Status:** ✅ **BON ENDROIT**

### 4. lobby-card.tsx
**Type:** Composant UI réutilisable  
**Props:** Génériques (lobby data)  
**Status:** ✅ **BON ENDROIT**

### 5. lobby-status-badge.tsx
**Type:** Composant UI réutilisable  
**Props:** Status string  
**Status:** ✅ **BON ENDROIT**

### 6. player-avatar.tsx
**Type:** Composant UI réutilisable  
**Props:** Player data  
**Status:** ✅ **BON ENDROIT**

---

## 🎯 Résumé de la Décision

### ✅ AUCUNE MIGRATION NÉCESSAIRE !

**Tous les composants sont déjà au bon endroit :**

- **apps/infinity/components/** (7 fichiers) : Composants avec logique métier ✅
- **packages/ui/components/** (6+ fichiers) : Composants UI réutilisables ✅

**Raison :**
- Les composants dans `apps/infinity` ont tous des dépendances métier (hooks, services, contexts)
- Les composants dans `packages/ui` sont tous génériques et réutilisables
- La séparation actuelle respecte parfaitement les principes

---

## 📐 Règles Établies

### Pour Nouveaux Composants

#### Créer dans apps/infinity/components/ si :
- ✅ Utilise des hooks métier (`useLobbyDetails`, `useLobbyContext`, etc.)
- ✅ Appelle des services applicatifs (`lobbyService`, etc.)
- ✅ Dépend de contexts applicatifs (`TransmitProvider`, `LobbyProvider`)
- ✅ Utilise des routes spécifiques Infinity
- ✅ Est un layout, handler, ou wrapper applicatif

#### Créer dans packages/ui/components/ si :
- ✅ Composant purement présentationnel
- ✅ Props génériques et réutilisables
- ✅ Aucune dépendance à la logique métier
- ✅ Peut être documenté dans Storybook
- ✅ Utilisable dans plusieurs apps

---

## 🧪 Validation

### Commande de Vérification
```bash
# Vérifier qu'aucun composant apps/ n'est importé dans packages/ui
grep -r "from.*apps/" packages/ui/src/components/
# Résultat attendu: Aucun import ✅

# Lister les composants apps/infinity
ls -la apps/infinity/inertia/components/
# Résultat: 7 fichiers ✅

# Lister les composants packages/ui
ls -la packages/ui/src/components/
# Résultat: header, footer, lobby-*, player-*, primitives/ ✅
```

---

## 📝 Documentation des Imports

### Structure Recommandée

#### apps/infinity (composants métier)
```typescript
// Imports relatifs OK
import { useLobbyDetails } from '../hooks/use_lobby_details'
import { getLobbyService } from '../services/lobby_service'
import { Header } from '@tyfo.dev/ui/components/header' // packages/ui
```

#### packages/ui (composants UI)
```typescript
// Imports uniquement de packages/ui ou node_modules
import { Card } from '@tyfo.dev/ui/primitives/card'
import { Button } from '@tyfo.dev/ui/primitives/button'
// ❌ JAMAIS d'import de apps/
```

---

## ✅ Conclusion

**Situation Actuelle:** ✅ **PARFAITE**

**Aucune migration nécessaire**. La séparation actuelle est **exactement ce qu'elle devrait être** :

- Composants métier dans `apps/infinity/` ✅
- Composants UI dans `packages/ui/` ✅
- Aucun doublon ✅
- Séparation claire des responsabilités ✅

**Prochaines étapes :**
1. ✅ Documenter cette structure comme standard
2. ✅ Ajouter les règles dans `.windsurfrules`
3. ✅ Former l'équipe sur les critères de décision
4. ⏳ Ajouter des tests pour bloquer les imports interdits

---

**Status:** ✅ **VALIDÉ - Aucune action requise**
