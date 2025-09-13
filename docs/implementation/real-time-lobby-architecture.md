# Architecture Temps Réel des Lobbies - Infinity Project

## Vue d'ensemble

Cette documentation définit l'architecture hybride Inertia.js + Transmit pour le système de lobbies temps réel du projet Infinity. Elle respecte les patterns Board Game Arena avec des états standardisés et des transitions validées.

## Architecture Hybride

### Principe Fondamental
- **Inertia.js** : Source de vérité initiale (affichage immédiat)
- **Transmit** : Mises à jour temps réel uniquement
- **Fallback gracieux** : Fonctionne même si Transmit échoue

### Flux de Données
```
Backend → Inertia Props → UI (immédiat)
Backend → Transmit Events → Services → Hooks → UI (temps réel)
```

## États de Lobby Standardisés

### États Board Game Arena
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

### Transitions Valides
- `WAITING` → `READY`, `FULL`, `CANCELLED`
- `READY` → `STARTING`, `WAITING`, `CANCELLED`
- `FULL` → `STARTING`, `READY`, `CANCELLED`
- `STARTING` → `IN_GAME`, `CANCELLED`
- `IN_GAME` → `PAUSED`, `FINISHED`
- `PAUSED` → `IN_GAME`, `CANCELLED`
- `FINISHED` → (aucune transition)
- `CANCELLED` → (aucune transition)

## Règles d'Implémentation Obligatoires

### 1. Pages et Composants

#### Règles Absolues
- **TOUJOURS** utiliser les données Inertia comme source initiale
- **TOUJOURS** implémenter un timeout de 10 secondes maximum
- **TOUJOURS** prévoir un fallback si Transmit échoue
- **JAMAIS** de mutation directe d'état (immutabilité stricte)
- **JAMAIS** de dépendances circulaires entre hooks

#### Logging Standardisé
- Pages : préfixe `🎮`
- Composants : préfixe `🔧`
- Services : préfixe `📡`
- Hooks : préfixe `🎯`

#### Structure Type d'une Page
```typescript
export default function LobbyPage({ lobby: initialLobby, user }: Props) {
  console.log('🎮 LobbyPage: Initializing', { lobbyUuid: initialLobby?.uuid })
  
  const { lobby, loading, error } = useLobbyDetails(initialLobby?.uuid || '')
  const [timeoutReached, setTimeoutReached] = useState(false)
  
  // Timeout protection obligatoire
  useEffect(() => {
    if (loading && !timeoutReached) {
      const timeout = setTimeout(() => {
        console.warn('🎮 LobbyPage: Timeout reached')
        setTimeoutReached(true)
      }, 10000)
      return () => clearTimeout(timeout)
    }
  }, [loading, timeoutReached])
  
  // Utiliser les données temps réel si disponibles, sinon les données initiales
  const effectiveLobby = lobby || initialLobby
  
  // Reste de l'implémentation...
}
```

### 2. Services

#### Règles Absolues
- **TOUJOURS** notifier les abonnés lors des changements d'état
- **TOUJOURS** maintenir l'immutabilité des objets
- **JAMAIS** de mutations directes des objets partagés
- **TOUJOURS** gérer les erreurs de connexion Transmit

#### Structure Type d'un Service
```typescript
export class LobbyService {
  private subscribers = new Set<(state: LobbyState) => void>()
  
  private notifySubscribers(newState: LobbyState) {
    console.log('📡 LobbyService: Notifying subscribers', { 
      subscriberCount: this.subscribers.size 
    })
    // Créer une copie immutable
    const immutableState = { ...newState }
    this.subscribers.forEach(callback => callback(immutableState))
  }
  
  updateLobby(lobby: Lobby) {
    console.log('📡 LobbyService: Updating lobby', { lobbyUuid: lobby.uuid })
    // Mise à jour immutable obligatoire
    this.currentState = {
      ...this.currentState,
      lobby: { ...lobby }
    }
    this.notifySubscribers(this.currentState)
  }
}
```

### 3. Hooks

#### Règles Absolues
- **TOUJOURS** implémenter un timeout de 10 secondes
- **TOUJOURS** throttler les mises à jour (max 10/seconde)
- **TOUJOURS** utiliser le contexte pour accéder aux services
- **JAMAIS** d'appels directs aux services sans contexte

#### Structure Type d'un Hook
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
      console.log('🎯 useLobbyDetails: Starting timeout protection')
      const timeout = setTimeout(() => {
        console.warn('🎯 useLobbyDetails: Timeout reached')
        setTimeoutReached(true)
        setState(prev => ({ ...prev, loading: false, error: 'Timeout' }))
      }, 10000)
      return () => clearTimeout(timeout)
    }
  }, [state.loading, timeoutReached])
  
  // Throttling obligatoire
  useEffect(() => {
    if (!lobbyService) return
    
    const unsubscribe = lobbyService.subscribeLobbyDetail(lobbyUuid, (newState) => {
      const now = Date.now()
      if (now - lastUpdateRef.current > 100) { // Max 10 updates/sec
        console.log('🎯 useLobbyDetails: Received update')
        setState(newState)
        lastUpdateRef.current = now
      }
    })
    
    return unsubscribe
  }, [lobbyService, lobbyUuid])
  
  return { ...state, timeoutReached }
}
```

## Système de Permissions

### Permissions Granulaires
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

### Calcul des Permissions
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

## Actions Utilisateur

### Actions Disponibles
- `joinLobby(userUuid)` : Rejoindre un lobby
- `leaveLobby(userUuid)` : Quitter un lobby
- `startGame(userUuid)` : Démarrer la partie
- `kickPlayer(playerUuid)` : Expulser un joueur (créateur seulement)
- `invitePlayer(playerUuid)` : Inviter un joueur (créateur seulement)
- `spectateGame()` : Observer la partie

### Gestion des Actions
```typescript
const handleJoinLobby = async () => {
  if (!permissions?.canJoin) {
    console.warn('🔧 Component: Cannot join lobby - no permission')
    return
  }
  
  console.log('🔧 Component: Joining lobby', { lobbyUuid })
  try {
    await lobbyService.joinLobby(lobbyUuid, userUuid)
    toast.success('Vous avez rejoint le lobby')
  } catch (error) {
    console.error('🔧 Component: Failed to join lobby', error)
    toast.error('Erreur lors de la connexion au lobby')
  }
}
```

## Événements Temps Réel

### Événements Obligatoires
- `lobby.created` : Nouveau lobby créé
- `lobby.updated` : Lobby mis à jour
- `lobby.deleted` : Lobby supprimé
- `lobby.player.joined` : Joueur rejoint
- `lobby.player.left` : Joueur quitté
- `lobby.status.changed` : Changement d'état
- `lobby.game.started` : Partie démarrée

### Structure des Événements
```typescript
interface LobbyTransmitEvent {
  type: 'lobby.player.joined' | 'lobby.player.left' | /* ... */
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

## Gestion d'État Local vs Global

### État Local (useState)
- État de chargement des composants
- État des formulaires
- État des modales/dialogs
- État des animations

### État Global (Context + Services)
- Données des lobbies
- Liste des lobbies
- État de connexion Transmit
- Données utilisateur

### Règle de Synchronisation
```typescript
// ✅ Correct : État local pour UI, global pour données
const [isModalOpen, setIsModalOpen] = useState(false) // Local
const { lobby } = useLobbyDetails(lobbyUuid) // Global

// ❌ Incorrect : Dupliquer les données globales en local
const [localLobby, setLocalLobby] = useState(lobby) // Ne pas faire
```

## Checklist d'Implémentation

### Pour chaque Page
- [ ] Utilise les données Inertia comme source initiale
- [ ] Implémente un timeout de 10 secondes
- [ ] Préfixe de logging `🎮`
- [ ] Fallback gracieux si Transmit échoue
- [ ] Gestion d'erreurs avec toasts

### Pour chaque Composant
- [ ] Calcul des permissions avec `getLobbyPermissions`
- [ ] Actions conditionnelles basées sur les permissions
- [ ] Préfixe de logging `🔧`
- [ ] Indicateurs visuels de l'état de connexion
- [ ] Gestion des états de chargement

### Pour chaque Hook
- [ ] Timeout de 10 secondes obligatoire
- [ ] Throttling des mises à jour (100ms minimum)
- [ ] Préfixe de logging `🎯`
- [ ] Utilisation du contexte pour les services
- [ ] Gestion des erreurs et cleanup

### Pour chaque Service
- [ ] Notifications immutables aux abonnés
- [ ] Préfixe de logging `📡`
- [ ] Gestion des erreurs de connexion
- [ ] Méthodes de souscription/désouscription
- [ ] État interne cohérent

## Anti-Patterns à Éviter

### ❌ Mutations Directes
```typescript
// Ne jamais faire
lobby.players.push(newPlayer)
state.loading = false
```

### ❌ Dépendances Circulaires
```typescript
// Ne jamais faire
const { lobby } = useLobbyDetails(lobbyUuid)
const { updateLobby } = useLobbyActions(lobby) // Dépendance circulaire
```

### ❌ Pas de Timeout
```typescript
// Ne jamais faire
const [loading, setLoading] = useState(true)
// Pas de timeout = risque de loading infini
```

### ❌ Accès Direct aux Services
```typescript
// Ne jamais faire
import { lobbyService } from '../services/lobby_service'
// Toujours passer par le contexte
```

## Exemples Concrets

### Page de Lobby Complète
```typescript
export default function GameLobby({ lobby: initialLobby, user }: Props) {
  console.log('🎮 GameLobby: Initializing', { 
    lobbyUuid: initialLobby?.uuid,
    hasUser: !!user 
  })

  const { lobby, loading, error } = useLobbyDetails(initialLobby?.uuid || '')
  const [timeoutReached, setTimeoutReached] = useState(false)

  // Timeout protection obligatoire
  useEffect(() => {
    if (loading && !timeoutReached) {
      console.log('🎮 GameLobby: Starting timeout protection (10s)')
      const timeout = setTimeout(() => {
        console.warn('🎮 GameLobby: Timeout reached')
        setTimeoutReached(true)
      }, 10000)
      return () => clearTimeout(timeout)
    }
  }, [loading, timeoutReached])

  const effectiveLobby = lobby || initialLobby
  const permissions = user ? getLobbyPermissions(effectiveLobby, user) : null

  if (!effectiveLobby) {
    return <div>Lobby introuvable</div>
  }

  return (
    <div>
      <LobbyHeader lobby={effectiveLobby} />
      <PlayerList 
        players={effectiveLobby.players} 
        permissions={permissions}
        currentUser={user}
      />
      <LobbyActions 
        lobby={effectiveLobby}
        permissions={permissions}
        loading={loading || timeoutReached}
      />
      {(!loading && error) && (
        <ErrorMessage message="Connexion temps réel indisponible" />
      )}
    </div>
  )
}
```

Cette architecture garantit une expérience utilisateur robuste avec des mises à jour temps réel fiables et un fallback gracieux en cas de problème de connexion.
