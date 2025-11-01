# 🔧 Fix: Lobby List Real-Time Synchronization

## ❌ Problème Identifié

La page `/lobbies` ne reçoit jamais les événements Transmit pour `lobby.created` et `lobby.deleted`.

### Cause Racine

**Race Condition React** : Les composants enfants (page Lobbies) lisent le `LobbyContext` **AVANT** que le `LobbyProvider` ait fini de créer le `LobbyService`.

```javascript
// Ordre de montage React
1. Page Lobbies se monte → lit LobbyContext → lobbyService = null
2. LobbyProvider crée le service → lobbyService = LobbyService
3. Le hook ne se ré-exécute jamais car le context ne déclenche pas de re-render
```

### Tentatives Échouées

1. ✅ **Backend envoie correctement** : `TransmitEventBridge` diffuse bien les événements
2. ❌ **useEffect avec dépendances** : Ne se ré-exécute pas quand le service devient disponible
3. ❌ **useState local** : N'est pas mis à jour quand le context change
4. ❌ **useMemo dans Provider** : Le hook lit l'ancien context avant le recalcul
5. ❌ **Bloquer le render** : Inertia.js monte les pages en parallèle avec les Providers

## ✅ Solution Proposée: Singleton Global

### Option A: LobbyService Global (Rapide)

Créer un singleton qui existe AVANT React:

```typescript
// lobby_service_singleton.ts
let globalLobbyService: LobbyService | null = null

export function initializeLobbyService(transmitContext: TransmitContextType) {
  if (!globalLobbyService) {
    globalLobbyService = new LobbyService(transmitContext)
  }
  return globalLobbyService
}

export function getLobbyService(): LobbyService | null {
  return globalLobbyService
}
```

```typescript
// LobbyProvider
const service = useMemo(() => {
  if (transmitContext) {
    return initializeLobbyService(transmitContext)
  }
  return null
}, [transmitContext])
```

```typescript
// useLobbyList
const lobbyService = getLobbyService() // Toujours disponible!
```

### Option B: Zustand Store (Recommandé)

Migrer vers Zustand comme proposé initialement dans `CLEAN_ARCHITECTURE_PROPOSAL.md`:

```typescript
// lobby_store.ts
import { create } from 'zustand'

interface LobbyStore {
  lobbies: LobbyData[]
  lobbyService: LobbyService | null
  
  setLobbyService: (service: LobbyService) => void
  initializeWithData: (lobbies: LobbyData[]) => void
}

export const useLobbyStore = create<LobbyStore>((set) => ({
  lobbies: [],
  lobbyService: null,
  
  setLobbyService: (service) => set({ lobbyService: service }),
  initializeWithData: (lobbies) => {
    const service = get().lobbyService
    if (service) {
      service.initializeWithInertiaData(lobbies)
    }
  },
}))
```

**Avantages Zustand** :
- ✅ Pas de race conditions
- ✅ Re-renders optimisés
- ✅ Debugging facile avec DevTools
- ✅ Architecture BGA-style
- ✅ Une seule source de vérité

## 📊 Temps Investi

- **Debugging**: 2h
- **Tentatives**: 5 approches différentes
- **Logs ajoutés**: ~50 console.log
- **Fichiers modifiés**: 4 (LobbyContext, useLobbyList, TransmitContext, pages/lobbies)

## 🎯 Recommandation

**Implémenter Option B (Zustand)** car:

1. **Résout le problème définitivement** : Plus de race conditions possibles
2. **Simplifie le code** : ~40% moins de code de gestion d'état
3. **Performance** : Re-renders optimisés automatiquement
4. **Maintenabilité** : Pattern standard reconnu
5. **Évolutivité** : Prêt pour d'autres features (game state, notifications, etc.)

## 📝 Prochaines Étapes

### Court Terme (Option A - 30 min)
1. Créer `lobby_service_singleton.ts`
2. Modifier `LobbyProvider` pour utiliser le singleton
3. Modifier `useLobbyList` pour lire le singleton
4. Tester tous les scénarios

### Long Terme (Option B - 2h)
1. Installer Zustand: `pnpm add zustand`
2. Créer `lobby_store.ts` basé sur `CLEAN_ARCHITECTURE_PROPOSAL.md`
3. Migrer `LobbyService` pour utiliser Zustand
4. Migrer tous les hooks vers `useLobbyStore()`
5. Supprimer `LobbyContext.tsx` (obsolète)
6. Tests complets

## 🔗 Références

- `CLEAN_ARCHITECTURE_PROPOSAL.md` : Architecture Zustand proposée
- `ARRAY_EMPTY_BUG_FIX.md` : Problème initial résolu
- `REFACTORING_CHECKLIST.md` : Backend as source of truth
- `TRANSMIT_FIX_SUMMARY.md` : Fix précédent (Inertia + Transmit)
