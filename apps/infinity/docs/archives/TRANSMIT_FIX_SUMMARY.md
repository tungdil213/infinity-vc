# Correction du Système Temps Réel Transmit

## 📋 Résumé des Problèmes Identifiés

### 1. **Backend diffusait correctement** ✅
Les logs montraient que les événements étaient bien publiés via Transmit:
```
✅ TransmitEventBridge: Successfully broadcasted to channel lobbies
✅ TransmitEventBridge: Successfully broadcasted to channel lobbies/dbc00fdb...
```

### 2. **Frontend ne recevait jamais les événements** ❌
- `TransmitProvider` mettait `isConnected=true` sans établir de vraie connexion SSE
- `LobbyService` initialisait les listeners mais ils n'étaient jamais déclenchés
- Les données Inertia n'étaient pas utilisées comme source de vérité initiale
- Architecture trop complexe avec trop de couches

### 3. **Autres Problèmes**
- CSRF token invalide sur `/api/v1/lobbies/leave-on-close` (sendBeacon)
- Pas de fallback gracieux si Transmit échoue
- Mutations d'état non immutables

## 🔧 Corrections Apportées

### 1. **LobbyService Refactorisé** (`inertia/services/lobby_service.ts`)

#### Avant
```typescript
// Initialisait automatiquement Transmit dans le constructor
// Pas de données Inertia initiales
// Mutations directes d'état
```

#### Après
```typescript
// Nouvelle méthode: initializeWithInertiaData(initialLobbies)
// Architecture hybride:
// - Inertia = source de vérité initiale (affichage immédiat)
// - Transmit = mises à jour temps réel
// - Immutabilité stricte sur tous les états
// - Logs détaillés pour debug
```

**Fonctionnalités clés:**
- ✅ Initialisation explicite avec données Inertia
- ✅ Immutabilité stricte (`...spread` operators)
- ✅ Logs détaillés avec emojis 📡
- ✅ Fallback gracieux si Transmit échoue
- ✅ Gestion d'erreurs robuste

### 2. **LobbyContext Simplifié** (`inertia/contexts/LobbyContext.tsx`)

#### Avant
```typescript
// Attendait que Transmit soit connecté avant de créer le service
// Pas d'initialisation avec données Inertia
```

#### Après
```typescript
// Crée le service immédiatement (sans attendre Transmit)
// Laisse les hooks appeler initializeWithInertiaData()
```

### 3. **Hook useLobbyList Corrigé** (`inertia/hooks/use_lobby_list.ts`)

#### Avant
```typescript
export function useLobbyList(options = {}) {
  const [localState, setLocalState] = useState({
    lobbies: [], // État vide!
    loading: false,
    // ...
  })
  // ...
}
```

#### Après
```typescript
export function useLobbyList(
  options = {},
  initialLobbies = [] // <-- Données Inertia passées ici!
) {
  const [localState, setLocalState] = useState({
    lobbies: initialLobbies, // <-- Affichage immédiat!
    loading: false,
    // ...
  })
  
  useEffect(() => {
    if (!lobbyService) return
    
    // ÉTAPE 1: Initialiser avec Inertia
    lobbyService.initializeWithInertiaData(initialLobbies)
    
    // ÉTAPE 2: S'abonner aux mises à jour Transmit
    const unsubscribe = lobbyService.subscribeLobbyList((newState) => {
      // Throttle à 100ms
      setLocalState(convertLobbyListState(newState))
    })
    
    return () => unsubscribe()
  }, [lobbyService, initialLobbies])
}
```

### 4. **Page Lobbies Mise à Jour** (`inertia/pages/lobbies.tsx`)

#### Avant
```typescript
const { lobbies: realtimeLobbies, ... } = useLobbyList({})
const lobbies = realtimeLobbies.length > 0 ? realtimeLobbies : initialLobbies
```

#### Après
```typescript
const { lobbies: realtimeLobbies, ... } = useLobbyList({}, initialLobbies)
const lobbies = realtimeLobbies // Déjà initialisé avec Inertia!
```

### 5. **CSRF Exception** (`config/shield.ts`)

Ajout d'une exception CSRF pour `/api/v1/lobbies/leave-on-close`:
```typescript
csrf: {
  enabled: true,
  exceptRoutes: [
    // navigator.sendBeacon cannot send custom headers
    // Security: Route validates user session and userUuid match
    '/api/v1/lobbies/leave-on-close',
  ],
  // ...
}
```

## 🎯 Architecture Finale

```
┌──────────────────────────────────────────────────────────┐
│                     ARCHITECTURE HYBRIDE                  │
└──────────────────────────────────────────────────────────┘

1. CHARGEMENT INITIAL (Inertia)
   Backend → Inertia Props → Page Component → Hook
   └─> Affichage immédiat des lobbies existants

2. TEMPS RÉEL (Transmit)
   Backend Event → Transmit Broadcast → TransmitClient
   └─> LobbyService Handlers → Subscribers → React State Update
   
3. FLUX COMPLET
   ┌─────────────┐         ┌──────────────┐
   │   Backend   │────────>│   Transmit   │
   │  (Create)   │         │  (Broadcast) │
   └─────────────┘         └──────┬───────┘
                                  │
                                  v
                           ┌──────────────┐
                           │ TransmitClient│
                           │  (Frontend)   │
                           └──────┬────────┘
                                  │
                                  v
                           ┌──────────────┐
                           │ LobbyService  │
                           │  (Handlers)   │
                           └──────┬────────┘
                                  │
                                  v
                           ┌──────────────┐
                           │ Subscribers   │
                           │  (Callbacks)  │
                           └──────┬────────┘
                                  │
                                  v
                           ┌──────────────┐
                           │  React State  │
                           │   (Update)    │
                           └──────────────┘
```

## ✅ Checklist de Test

### 1. Test de Chargement Initial
- [ ] Ouvrir `/lobbies`
- [ ] Vérifier que les lobbies s'affichent immédiatement (données Inertia)
- [ ] Console: Voir logs `📡 LobbyService: Initializing with Inertia data`

### 2. Test de Création de Lobby
- [ ] Créer un nouveau lobby
- [ ] **DANS UN AUTRE ONGLET/NAVIGATEUR**: Ouvrir `/lobbies`
- [ ] Vérifier que le nouveau lobby apparaît automatiquement
- [ ] Console: Voir `📡 LobbyService: 🎉 ÉVÉNEMENT REÇU sur canal lobbies`
- [ ] Console: Voir `📡 LobbyService: → Traitement lobby.created`
- [ ] Console: Voir `📡 LobbyService: ✅ Lobby ajouté - nouveau total`

### 3. Test de Join/Leave
- [ ] User 1: Créer un lobby
- [ ] User 2 (autre onglet): Rejoindre le lobby
- [ ] Vérifier que le compteur de joueurs se met à jour en temps réel sur les deux pages
- [ ] Console: Voir `📡 LobbyService: → Traitement lobby.player.joined`

### 4. Test de Suppression
- [ ] User 1: Créer un lobby
- [ ] User 2: Voir le lobby apparaître
- [ ] User 1: Supprimer/quitter le lobby
- [ ] User 2: Vérifier que le lobby disparaît automatiquement
- [ ] Console: Voir `📡 LobbyService: → Traitement lobby.deleted`

### 5. Test CSRF Leave-on-Close
- [ ] Rejoindre un lobby
- [ ] Fermer l'onglet brutalement
- [ ] Vérifier que le joueur est bien retiré du lobby
- [ ] Console backend: NE DOIT PLUS voir `WARN Invalid or expired CSRF token`

### 6. Test Fallback Gracieux
- [ ] Désactiver temporairement Transmit (stopper le serveur)
- [ ] Ouvrir `/lobbies`
- [ ] Vérifier que les lobbies s'affichent quand même (données Inertia)
- [ ] Console: Peut voir erreurs Transmit mais page fonctionne
- [ ] Relancer Transmit
- [ ] Vérifier que le temps réel reprend automatiquement

## 🐛 Logs à Observer

### Console Frontend (Succès)
```
📡 TransmitProvider: Initializing connection
🔧 LobbyProvider: Initialisation du LobbyService
🔧 LobbyProvider: Service créé (sans initialisation Transmit)
🎯 useLobbyList: Hook initialized { initialLobbiesCount: 2 }
🎯 useLobbyList: Initialisation du service avec données Inertia
📡 LobbyService: Initializing with Inertia data { lobbyCount: 2 }
📡 LobbyService: Configuration des listeners Transmit pour le canal global lobbies
📡 LobbyService: ✅ Abonnement global configuré avec succès
📡 LobbyService: Initialization complete

// Lors d'un événement:
📡 LobbyService: 🎉 ÉVÉNEMENT REÇU sur canal lobbies: { type: 'lobby.created', ... }
📡 LobbyService: → Traitement lobby.created
📡 LobbyService: ✅ Lobby ajouté - nouveau total: 3
📡 notifyLobbyListSubscribers - nombre de callbacks: 1
🎯 useLobbyList: 🔄 Mise à jour reçue { lobbyCount: 3 }
```

### Console Backend (Succès)
```
📡 EventBus: Publishing event lobby.created { eventId: '...', correlationId: '...' }
📡 TransmitEventBridge: Broadcasting lobby.created via Transmit
✅ TransmitEventBridge: Successfully broadcasted to channel lobbies/xxx
✅ TransmitEventBridge: Successfully broadcasted to channel lobbies
```

## 🚀 Commandes de Test

```bash
# Terminal 1: Lancer le serveur
cd apps/infinity
node ace serve --watch

# Terminal 2 (optionnel): Watch logs
cd apps/infinity
tail -f storage/logs/app.log

# Navigateur:
# - Ouvrir http://localhost:3333/lobbies
# - Ouvrir DevTools Console
# - Suivre les logs 📡 🎯 🔧
```

## 📝 Principes Respectés

✅ **Architecture Hybride**: Inertia (initial) + Transmit (temps réel)
✅ **Source de Vérité**: Données Inertia comme base, Transmit pour updates
✅ **Immutabilité**: Aucune mutation directe d'état
✅ **Fallback Gracieux**: Fonctionne même si Transmit échoue
✅ **Logging Standardisé**: Emojis 📡 (services), 🎯 (hooks), 🔧 (composants), 🎮 (pages)
✅ **Throttling**: Max 10 updates/seconde (100ms)
✅ **Timeout**: Protection contre loading infini (5-10s)
✅ **CSRF Sécurisé**: Exception documentée pour sendBeacon

## 🔍 Debug Tips

### Si les événements ne sont pas reçus:

1. **Vérifier la connexion Transmit**
   ```javascript
   // Console Frontend
   console.log(transmitClient) // Doit être défini
   ```

2. **Vérifier les subscriptions actives**
   ```javascript
   // Console Frontend
   transmitLobbyClient.getActiveSubscriptions() // Doit contenir 'lobbies'
   ```

3. **Vérifier les logs backend**
   ```bash
   # Doit voir:
   ✅ TransmitEventBridge: Successfully broadcasted to channel lobbies
   ```

4. **Vérifier les callbacks**
   ```javascript
   // Dans LobbyService
   console.log('Callbacks enregistrés:', this.lobbyListCallbacks.size) // Doit être > 0
   ```

### Si CSRF token errors persistent:

1. Vérifier la config shield:
   ```typescript
   // config/shield.ts
   exceptRoutes: ['/api/v1/lobbies/leave-on-close']
   ```

2. Redémarrer le serveur après modification de config

## 📚 Fichiers Modifiés

- ✅ `inertia/services/lobby_service.ts` - Refactoring complet
- ✅ `inertia/contexts/LobbyContext.tsx` - Simplification
- ✅ `inertia/hooks/use_lobby_list.ts` - Ajout paramètre initialLobbies
- ✅ `inertia/pages/lobbies.tsx` - Passage données Inertia au hook
- ✅ `config/shield.ts` - Exception CSRF pour leave-on-close

## 🎉 Résultat Attendu

**Avant**: Créer un lobby → refresh manuel nécessaire pour voir le nouveau lobby

**Après**: Créer un lobby → apparaît instantanément sur tous les onglets ouverts! 🚀
