# Règles de Développement - Système de Lobbies Temps Réel

## Interdictions Absolues

### ❌ Mutations Directes d'État
```typescript
// INTERDIT
lobby.players.push(newPlayer)
state.loading = false
lobbyList[0].status = 'READY'

// OBLIGATOIRE
setLobby(prev => ({
  ...prev,
  players: [...prev.players, newPlayer]
}))
```

### ❌ Dépendances Circulaires
```typescript
// INTERDIT
const { lobby } = useLobbyDetails(lobbyUuid)
const { actions } = useLobbyActions(lobby) // Dépendance circulaire

// OBLIGATOIRE
const { lobby } = useLobbyDetails(lobbyUuid)
const { actions } = useLobbyActions() // Actions indépendantes
```

### ❌ Accès Direct aux Services
```typescript
// INTERDIT
import { lobbyService } from '../services/lobby_service'

// OBLIGATOIRE
const { lobbyService } = useLobbyContext()
```

### ❌ Loading Infini
```typescript
// INTERDIT - Pas de timeout
const [loading, setLoading] = useState(true)

// OBLIGATOIRE - Timeout de 10 secondes
useEffect(() => {
  if (loading && !timeoutReached) {
    const timeout = setTimeout(() => {
      setTimeoutReached(true)
      setLoading(false)
    }, 10000)
    return () => clearTimeout(timeout)
  }
}, [loading, timeoutReached])
```

## Obligations Strictes

### ✅ Timeout Obligatoire (10 secondes)
```typescript
// Dans TOUS les hooks et composants avec loading
const [timeoutReached, setTimeoutReached] = useState(false)

useEffect(() => {
  if (loading && !timeoutReached) {
    console.log('🎯 Component: Starting timeout protection (10s)')
    const timeout = setTimeout(() => {
      console.warn('🎯 Component: Timeout reached')
      setTimeoutReached(true)
      // Action de fallback obligatoire
    }, 10000)
    return () => clearTimeout(timeout)
  }
}, [loading, timeoutReached])
```

### ✅ Logging Standardisé
```typescript
// Préfixes obligatoires par type de composant
console.log('🎮 PageName: Message')      // Pages
console.log('🔧 ComponentName: Message') // Composants
console.log('📡 ServiceName: Message')   // Services
console.log('🎯 HookName: Message')      // Hooks
```

### ✅ Props Inertia Obligatoires
```typescript
// TOUJOURS utiliser les données Inertia comme source initiale
interface PageProps {
  initialLobby: Lobby | null  // Source de vérité initiale
  currentUser?: User
}

export default function LobbyPage({ initialLobby, currentUser }: PageProps) {
  const { lobby: realtimeLobby } = useLobbyDetails(initialLobby?.uuid || '')
  // Utiliser les données temps réel si disponibles, sinon les données initiales
  const effectiveLobby = realtimeLobby || initialLobby
}
```

## États de Lobby Standardisés

### États Board Game Arena (OBLIGATOIRES)
```typescript
export const LOBBY_STATUS = {
  WAITING: 'WAITING',     // En attente de plus de joueurs (1 joueur)
  READY: 'READY',         // Prêt à commencer (2-3 joueurs)  
  FULL: 'FULL',           // Lobby complet (4 joueurs)
  STARTING: 'STARTING',   // Démarrage en cours
  IN_GAME: 'IN_GAME',     // Partie en cours
  PAUSED: 'PAUSED',       // Partie en pause
  FINISHED: 'FINISHED',   // Partie terminée
  CANCELLED: 'CANCELLED', // Partie annulée
} as const
```

### Transitions Valides (OBLIGATOIRES)
```typescript
const validTransitions: Record<LobbyStatus, LobbyStatus[]> = {
  [LOBBY_STATUS.WAITING]: [LOBBY_STATUS.READY, LOBBY_STATUS.FULL, LOBBY_STATUS.CANCELLED],
  [LOBBY_STATUS.READY]: [LOBBY_STATUS.STARTING, LOBBY_STATUS.WAITING, LOBBY_STATUS.CANCELLED],
  [LOBBY_STATUS.FULL]: [LOBBY_STATUS.STARTING, LOBBY_STATUS.READY, LOBBY_STATUS.CANCELLED],
  [LOBBY_STATUS.STARTING]: [LOBBY_STATUS.IN_GAME, LOBBY_STATUS.CANCELLED],
  [LOBBY_STATUS.IN_GAME]: [LOBBY_STATUS.PAUSED, LOBBY_STATUS.FINISHED],
  [LOBBY_STATUS.PAUSED]: [LOBBY_STATUS.IN_GAME, LOBBY_STATUS.CANCELLED],
  [LOBBY_STATUS.FINISHED]: [], // État final
  [LOBBY_STATUS.CANCELLED]: [], // État final
}
```

## Système de Permissions Granulaire

### Permissions Obligatoires
```typescript
interface LobbyPermissions {
  canJoin: boolean      // Peut rejoindre le lobby
  canLeave: boolean     // Peut quitter le lobby
  canStart: boolean     // Peut démarrer la partie
  canKick: boolean      // Peut expulser un joueur
  canInvite: boolean    // Peut inviter un joueur
  canSpectate: boolean  // Peut observer la partie
  isCreator: boolean    // Est le créateur du lobby
  isPlayer: boolean     // Est un joueur du lobby
}
```

### Calcul des Permissions (OBLIGATOIRE)
```typescript
export function getLobbyPermissions(
  lobby: Lobby | null,
  currentUser: { uuid: string }
): LobbyPermissions {
  if (!lobby) return defaultPermissions
  
  const isCreator = lobby.createdBy === currentUser.uuid
  const isPlayer = lobby.players.some(p => p.uuid === currentUser.uuid)
  
  return {
    canJoin: !isPlayer && lobby.hasAvailableSlots && 
             (lobby.status === LOBBY_STATUS.WAITING || lobby.status === LOBBY_STATUS.READY),
    canLeave: isPlayer,
    canStart: isCreator && lobby.canStart,
    canKick: isCreator && lobby.currentPlayers > 1,
    canInvite: isCreator && lobby.hasAvailableSlots,
    canSpectate: !isPlayer,
    isCreator,
    isPlayer,
  }
}
```

## Actions Utilisateur Complètes

### Actions Disponibles
- `joinLobby(userUuid)` : Rejoindre un lobby
- `leaveLobby(userUuid)` : Quitter un lobby  
- `startGame(userUuid)` : Démarrer la partie
- `kickPlayer(playerUuid)` : Expulser un joueur
- `invitePlayer(playerUuid)` : Inviter un joueur
- `spectateGame()` : Observer la partie

### Pattern d'Action Obligatoire
```typescript
const handleAction = async () => {
  if (!permissions?.canAction) {
    console.warn('🔧 Component: Cannot perform action - no permission')
    toast.warning('Action non autorisée')
    return
  }
  
  console.log('🔧 Component: Performing action', { context })
  setLoading(true)
  
  try {
    await service.performAction(params)
    console.log('🔧 Component: Action successful')
    toast.success('Action réalisée avec succès')
  } catch (error) {
    console.error('🔧 Component: Action failed', error)
    toast.error('Erreur lors de l\'action')
  } finally {
    setLoading(false)
  }
}
```

## Événements Temps Réel Obligatoires

### Événements Standard
```typescript
interface LobbyTransmitEvent {
  type: 
    | 'lobby.created'       // Nouveau lobby créé
    | 'lobby.updated'       // Lobby mis à jour
    | 'lobby.deleted'       // Lobby supprimé
    | 'lobby.player.joined' // Joueur rejoint
    | 'lobby.player.left'   // Joueur quitté
    | 'lobby.status.changed'// Changement d'état
    | 'lobby.game.started'  // Partie démarrée
  data: {
    lobby?: Lobby
    lobbyUuid?: string
    player?: Player
    playerUuid?: string
    oldStatus?: LobbyStatus
    newStatus?: LobbyStatus
    gameUuid?: string
  }
  timestamp: string
  channel: string
}
```

### Gestion des Événements (OBLIGATOIRE)
```typescript
// Dans les services
private handleLobbyEvent(event: LobbyTransmitEvent) {
  console.log('📡 Service: Received event', { type: event.type })
  
  switch (event.type) {
    case 'lobby.player.joined':
      this.updateLobbyPlayers(event.data.lobbyUuid, event.data.player)
      break
    case 'lobby.status.changed':
      this.updateLobbyStatus(event.data.lobbyUuid, event.data.newStatus)
      break
    // Autres événements...
  }
  
  this.notifySubscribers()
}
```

## Gestion d'État Local vs Global

### État Local (useState) - AUTORISÉ
- État de chargement des composants
- État des formulaires
- État des modales/dialogs
- État des animations
- Flags de timeout

### État Global (Context + Services) - OBLIGATOIRE
- Données des lobbies
- Liste des lobbies
- État de connexion Transmit
- Données utilisateur
- Cache des permissions

### Règle de Synchronisation
```typescript
// ✅ CORRECT
const [isModalOpen, setIsModalOpen] = useState(false) // Local UI
const { lobby } = useLobbyDetails(lobbyUuid) // Global data

// ❌ INTERDIT
const [localLobby, setLocalLobby] = useState(lobby) // Duplication
```

## Throttling et Performance

### Throttling Obligatoire
```typescript
// Dans TOUS les hooks avec mises à jour temps réel
const lastUpdateRef = useRef(Date.now())

const handleUpdate = (newState) => {
  const now = Date.now()
  if (now - lastUpdateRef.current > 100) { // Max 10 updates/sec
    console.log('🎯 Hook: Applying throttled update')
    setState(newState)
    lastUpdateRef.current = now
  } else {
    console.log('🎯 Hook: Update throttled')
  }
}
```

### Optimisation Mémoire
```typescript
// Cleanup obligatoire dans tous les useEffect
useEffect(() => {
  const unsubscribe = service.subscribe(callback)
  
  return () => {
    console.log('🎯 Hook: Cleaning up subscription')
    unsubscribe()
  }
}, [dependencies])
```

## Checklist de Review

### Pour chaque Page
- [ ] ✅ Utilise les données Inertia comme source initiale
- [ ] ✅ Implémente un timeout de 10 secondes
- [ ] ✅ Préfixe de logging `🎮`
- [ ] ✅ Fallback gracieux si Transmit échoue
- [ ] ✅ Gestion d'erreurs avec toasts
- [ ] ✅ Calcul des permissions avec `getLobbyPermissions`

### Pour chaque Composant
- [ ] ✅ Actions conditionnelles basées sur les permissions
- [ ] ✅ Préfixe de logging `🔧`
- [ ] ✅ Indicateurs visuels de l'état de connexion
- [ ] ✅ Gestion des états de chargement
- [ ] ✅ Immutabilité des mises à jour d'état

### Pour chaque Hook
- [ ] ✅ Timeout de 10 secondes obligatoire
- [ ] ✅ Throttling des mises à jour (100ms minimum)
- [ ] ✅ Préfixe de logging `🎯`
- [ ] ✅ Utilisation du contexte pour les services
- [ ] ✅ Cleanup des souscriptions
- [ ] ✅ Gestion des erreurs

### Pour chaque Service
- [ ] ✅ Notifications immutables aux abonnés
- [ ] ✅ Préfixe de logging `📡`
- [ ] ✅ Gestion des erreurs de connexion
- [ ] ✅ Méthodes de souscription/désouscription
- [ ] ✅ État interne cohérent
- [ ] ✅ Gestion des événements Transmit

## Anti-Patterns Critiques

### 🚨 Erreurs Graves
1. **Pas de timeout** → Loading infini
2. **Mutations directes** → Bugs React
3. **Pas de throttling** → Performance dégradée
4. **Pas de cleanup** → Memory leaks
5. **Pas de fallback** → UX cassée si Transmit échoue

### 🚨 Erreurs de Sécurité
1. **Actions sans vérification de permissions**
2. **Exposition d'états internes sensibles**
3. **Pas de validation des transitions d'état**

### 🚨 Erreurs d'Architecture
1. **Dépendances circulaires entre hooks**
2. **Accès direct aux services sans contexte**
3. **Duplication d'état entre local et global**

## Exemples de Code Conforme

### Hook Complet
```typescript
export function useLobbyDetails(lobbyUuid: string) {
  console.log('🎯 useLobbyDetails: Initializing', { lobbyUuid })
  
  const { lobbyService } = useLobbyContext()
  const [state, setState] = useState<LobbyDetailState>({
    lobby: null,
    loading: true,
    error: null
  })
  const [timeoutReached, setTimeoutReached] = useState(false)
  const lastUpdateRef = useRef(Date.now())
  
  // Timeout protection obligatoire
  useEffect(() => {
    if (state.loading && !timeoutReached) {
      console.log('🎯 useLobbyDetails: Starting timeout protection (10s)')
      const timeout = setTimeout(() => {
        console.warn('🎯 useLobbyDetails: Timeout reached')
        setTimeoutReached(true)
        setState(prev => ({ ...prev, loading: false, error: 'Connection timeout' }))
      }, 10000)
      
      return () => {
        console.log('🎯 useLobbyDetails: Clearing timeout')
        clearTimeout(timeout)
      }
    }
  }, [state.loading, timeoutReached])
  
  // Souscription avec throttling
  useEffect(() => {
    if (!lobbyService || !lobbyUuid) return
    
    console.log('🎯 useLobbyDetails: Subscribing to lobby updates')
    
    const unsubscribe = lobbyService.subscribeLobbyDetail(lobbyUuid, (newState) => {
      const now = Date.now()
      if (now - lastUpdateRef.current > 100) {
        console.log('🎯 useLobbyDetails: Applying update')
        setState(newState)
        lastUpdateRef.current = now
      }
    })
    
    return () => {
      console.log('🎯 useLobbyDetails: Unsubscribing from lobby updates')
      unsubscribe()
    }
  }, [lobbyService, lobbyUuid])
  
  return { ...state, timeoutReached }
}
```

### Composant Complet
```typescript
export function LobbyActions({ lobby, permissions, currentUser }: Props) {
  console.log('🔧 LobbyActions: Rendering', { 
    lobbyUuid: lobby?.uuid,
    hasPermissions: !!permissions 
  })
  
  const { lobbyService } = useLobbyContext()
  const [isJoining, setIsJoining] = useState(false)
  
  const handleJoinLobby = async () => {
    if (!permissions?.canJoin || !currentUser) {
      console.warn('🔧 LobbyActions: Cannot join - no permission')
      toast.warning('Vous ne pouvez pas rejoindre ce lobby')
      return
    }
    
    console.log('🔧 LobbyActions: Joining lobby', { lobbyUuid: lobby.uuid })
    setIsJoining(true)
    
    try {
      await lobbyService.joinLobby(lobby.uuid, currentUser.uuid)
      console.log('🔧 LobbyActions: Successfully joined lobby')
      toast.success('Vous avez rejoint le lobby')
    } catch (error) {
      console.error('🔧 LobbyActions: Failed to join lobby', error)
      toast.error('Erreur lors de la connexion au lobby')
    } finally {
      setIsJoining(false)
    }
  }
  
  return (
    <div className="flex gap-2">
      {permissions?.canJoin && (
        <Button 
          onClick={handleJoinLobby}
          disabled={isJoining}
          loading={isJoining}
        >
          {isJoining ? 'Connexion...' : 'Rejoindre'}
        </Button>
      )}
      
      {permissions?.canLeave && (
        <Button 
          variant="outline"
          onClick={handleLeaveLobby}
          disabled={isLeaving}
        >
          Quitter
        </Button>
      )}
      
      {permissions?.canStart && (
        <Button 
          variant="default"
          onClick={handleStartGame}
          disabled={isStarting}
        >
          Démarrer la partie
        </Button>
      )}
    </div>
  )
}
```

Ces règles garantissent une implémentation robuste, performante et maintenable du système de lobbies temps réel.
