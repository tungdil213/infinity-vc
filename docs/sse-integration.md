# Intégration SSE (Server-Sent Events)

## Vue d'ensemble

Le système utilise **Server-Sent Events (SSE)** au lieu de WebSockets pour les mises à jour temps réel. Cette approche est plus simple à implémenter, plus fiable en cas de reconnexion, et parfaitement adaptée aux besoins du jeu (communication unidirectionnelle serveur → client).

## Pourquoi SSE plutôt que WebSockets ?

### Avantages des SSE
- **Simplicité** : Protocole HTTP standard, pas de handshake complexe
- **Reconnexion automatique** : Le navigateur reconnecte automatiquement
- **Compatibilité** : Fonctionne avec tous les proxies/firewalls HTTP
- **Debugging** : Visible dans les outils de développement
- **Unidirectionnel** : Parfait pour les notifications (serveur → client)

### Cas d'usage dans le jeu
- Notifications de lobby (joueur rejoint/quitte)
- Démarrage de partie
- Mises à jour d'état de jeu
- Messages de chat
- Notifications système

## Architecture SSE

### Structure générale

```
Client (React)     SSE Connection     Server (AdonisJS)
     │ ←────────── EventStream ←──────────── │
     │                                       │
     │ ──────────── HTTP POST ──────────────→ │
     │              (Actions)                │
```

### Composants principaux

1. **SSEController** : Gestion des connexions SSE
2. **EventBroadcaster** : Diffusion des événements
3. **SSEMiddleware** : Authentification des connexions
4. **EventSubscriber** : Abonnement côté client

## Implémentation Backend

### 1. Configuration SSE

```typescript
// config/sse.ts
import { defineConfig } from '@adonisjs/core/build/config'

export default defineConfig({
  // Configuration des headers SSE
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  },
  
  // Heartbeat pour maintenir la connexion
  heartbeatInterval: 30000, // 30 secondes
  
  // Timeout de connexion
  connectionTimeout: 300000, // 5 minutes
})
```

### 2. SSE Controller

```typescript
// app/Controllers/Http/SSEController.ts
import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core/build/standalone'
import EventBroadcaster from '#services/EventBroadcaster'

@inject()
export default class SSEController {
  constructor(private eventBroadcaster: EventBroadcaster) {}

  async connect({ request, response, auth }: HttpContext) {
    const user = auth.user!
    
    // Configuration des headers SSE
    response.response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    })

    // Création de la connexion
    const connectionId = this.generateConnectionId()
    const connection = new SSEConnection(connectionId, user.uuid, response)
    
    // Enregistrement de la connexion
    await this.eventBroadcaster.addConnection(connection)
    
    // Message de bienvenue
    connection.send('connected', {
      connectionId,
      timestamp: new Date().toISOString()
    })

    // Gestion de la déconnexion
    request.request.on('close', async () => {
      await this.eventBroadcaster.removeConnection(connectionId)
    })

    // Heartbeat pour maintenir la connexion
    const heartbeat = setInterval(() => {
      connection.ping()
    }, 30000)

    request.request.on('close', () => {
      clearInterval(heartbeat)
    })
  }

  private generateConnectionId(): string {
    return `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
```

### 3. SSE Connection Class

```typescript
// app/Services/SSEConnection.ts
import type { Response } from '@adonisjs/core/http'

export default class SSEConnection {
  private isAlive: boolean = true

  constructor(
    public readonly id: string,
    public readonly userUUID: string,
    private response: Response
  ) {}

  send(event: string, data: any): void {
    if (!this.isAlive) return

    try {
      const message = this.formatSSEMessage(event, data)
      this.response.response.write(message)
    } catch (error) {
      this.close()
    }
  }

  ping(): void {
    this.send('ping', { timestamp: new Date().toISOString() })
  }

  close(): void {
    this.isAlive = false
    try {
      this.response.response.end()
    } catch (error) {
      // Connection already closed
    }
  }

  private formatSSEMessage(event: string, data: any): string {
    const jsonData = JSON.stringify(data)
    return `event: ${event}\ndata: ${jsonData}\n\n`
  }

  get alive(): boolean {
    return this.isAlive
  }
}
```

### 4. Event Broadcaster Service

```typescript
// app/Services/EventBroadcaster.ts
import SSEConnection from './SSEConnection'
import logger from '@adonisjs/core/services/logger'

export default class EventBroadcaster {
  private connections: Map<string, SSEConnection> = new Map()
  private userConnections: Map<string, Set<string>> = new Map()

  async addConnection(connection: SSEConnection): Promise<void> {
    this.connections.set(connection.id, connection)
    
    // Index par utilisateur
    if (!this.userConnections.has(connection.userUUID)) {
      this.userConnections.set(connection.userUUID, new Set())
    }
    this.userConnections.get(connection.userUUID)!.add(connection.id)

    logger.info('SSE connection added', {
      connectionId: connection.id,
      userUUID: connection.userUUID,
      totalConnections: this.connections.size
    })
  }

  async removeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    // Nettoyage des index
    this.connections.delete(connectionId)
    const userConnections = this.userConnections.get(connection.userUUID)
    if (userConnections) {
      userConnections.delete(connectionId)
      if (userConnections.size === 0) {
        this.userConnections.delete(connection.userUUID)
      }
    }

    connection.close()

    logger.info('SSE connection removed', {
      connectionId,
      userUUID: connection.userUUID,
      totalConnections: this.connections.size
    })
  }

  // Diffusion à tous les clients connectés
  broadcast(event: string, data: any): void {
    const message = { event, data, timestamp: new Date().toISOString() }
    
    for (const connection of this.connections.values()) {
      connection.send(event, message)
    }

    logger.debug('SSE broadcast sent', {
      event,
      recipientCount: this.connections.size
    })
  }

  // Diffusion à un utilisateur spécifique
  sendToUser(userUUID: string, event: string, data: any): void {
    const userConnectionIds = this.userConnections.get(userUUID)
    if (!userConnectionIds) return

    const message = { event, data, timestamp: new Date().toISOString() }

    for (const connectionId of userConnectionIds) {
      const connection = this.connections.get(connectionId)
      if (connection) {
        connection.send(event, message)
      }
    }
  }

  // Diffusion à un groupe d'utilisateurs (ex: lobby)
  sendToUsers(userUUIDs: string[], event: string, data: any): void {
    for (const userUUID of userUUIDs) {
      this.sendToUser(userUUID, event, data)
    }
  }

  // Statistiques
  getStats(): SSEStats {
    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userConnections.size,
      connectionsPerUser: Array.from(this.userConnections.values())
        .map(connections => connections.size)
    }
  }
}

interface SSEStats {
  totalConnections: number
  uniqueUsers: number
  connectionsPerUser: number[]
}
```

### 5. Event Handlers pour les Lobbies

```typescript
// app/EventHandlers/LobbyEventHandler.ts
import { inject } from '@adonisjs/core/build/standalone'
import EventBroadcaster from '#services/EventBroadcaster'
import type { LobbyCreatedEvent, PlayerJoinedLobbyEvent } from '#events/LobbyEvents'

@inject()
export default class LobbyEventHandler {
  constructor(private eventBroadcaster: EventBroadcaster) {}

  async handleLobbyCreated(event: LobbyCreatedEvent): Promise<void> {
    // Notification globale de nouveau lobby
    this.eventBroadcaster.broadcast('lobby:created', {
      lobbyId: event.lobby.uuid,
      name: event.lobby.name,
      createdBy: event.lobby.createdBy,
      maxPlayers: event.lobby.maxPlayers,
      currentPlayers: event.lobby.playerCount
    })
  }

  async handlePlayerJoinedLobby(event: PlayerJoinedLobbyEvent): Promise<void> {
    const { lobby, player } = event

    // Notification aux joueurs du lobby
    const lobbyPlayerUUIDs = lobby.players.map(p => p.uuid)
    
    this.eventBroadcaster.sendToUsers(lobbyPlayerUUIDs, 'lobby:player_joined', {
      lobbyId: lobby.uuid,
      player: {
        uuid: player.uuid,
        nickName: player.nickName
      },
      currentPlayers: lobby.playerCount,
      lobbyStatus: lobby.status
    })

    // Mise à jour globale de la liste des lobbies
    this.eventBroadcaster.broadcast('lobby:updated', {
      lobbyId: lobby.uuid,
      currentPlayers: lobby.playerCount,
      status: lobby.status
    })
  }

  async handleGameStarted(event: GameStartedEvent): Promise<void> {
    const { game, players } = event
    const playerUUIDs = players.map(p => p.uuid)

    // Notification aux joueurs que la partie commence
    this.eventBroadcaster.sendToUsers(playerUUIDs, 'game:started', {
      gameId: game.uuid,
      players: players.map(p => ({
        uuid: p.uuid,
        nickName: p.nickName
      }))
    })

    // Le lobby n'existe plus, notification globale
    this.eventBroadcaster.broadcast('lobby:removed', {
      lobbyId: event.lobbyId
    })
  }
}
```

## Implémentation Frontend

### 1. Hook React pour SSE

```typescript
// resources/js/hooks/useSSE.ts
import { useEffect, useRef, useState } from 'react'

interface SSEOptions {
  url: string
  onMessage?: (event: string, data: any) => void
  onError?: (error: Event) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export function useSSE(options: SSEOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const eventSource = new EventSource(options.url, {
      withCredentials: true
    })

    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      setError(null)
      options.onConnect?.()
    }

    eventSource.onerror = (error) => {
      setIsConnected(false)
      setError('Connection error')
      options.onError?.(error)
    }

    // Écoute de tous les événements personnalisés
    const eventTypes = [
      'connected',
      'lobby:created',
      'lobby:updated',
      'lobby:removed',
      'lobby:player_joined',
      'lobby:player_left',
      'game:started',
      'game:updated',
      'chat:message',
      'ping'
    ]

    eventTypes.forEach(eventType => {
      eventSource.addEventListener(eventType, (event) => {
        if (eventType === 'ping') return // Ignore heartbeat
        
        try {
          const data = JSON.parse(event.data)
          options.onMessage?.(eventType, data)
        } catch (error) {
          console.error('Failed to parse SSE message:', error)
        }
      })
    })

    return () => {
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [options.url])

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }

  return {
    isConnected,
    error,
    disconnect
  }
}
```

### 2. Context Provider pour SSE

```typescript
// resources/js/contexts/SSEContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { useSSE } from '../hooks/useSSE'

interface SSEContextType {
  isConnected: boolean
  error: string | null
  subscribe: (event: string, handler: (data: any) => void) => () => void
}

const SSEContext = createContext<SSEContextType | null>(null)

export function SSEProvider({ children }: { children: React.ReactNode }) {
  const [eventHandlers, setEventHandlers] = useState<Map<string, Set<(data: any) => void>>>(new Map())

  const { isConnected, error } = useSSE({
    url: '/sse/connect',
    onMessage: (event, data) => {
      const handlers = eventHandlers.get(event)
      if (handlers) {
        handlers.forEach(handler => handler(data))
      }
    },
    onConnect: () => {
      console.log('SSE Connected')
    },
    onDisconnect: () => {
      console.log('SSE Disconnected')
    }
  })

  const subscribe = (event: string, handler: (data: any) => void) => {
    setEventHandlers(prev => {
      const newMap = new Map(prev)
      if (!newMap.has(event)) {
        newMap.set(event, new Set())
      }
      newMap.get(event)!.add(handler)
      return newMap
    })

    // Fonction de désabonnement
    return () => {
      setEventHandlers(prev => {
        const newMap = new Map(prev)
        const handlers = newMap.get(event)
        if (handlers) {
          handlers.delete(handler)
          if (handlers.size === 0) {
            newMap.delete(event)
          }
        }
        return newMap
      })
    }
  }

  return (
    <SSEContext.Provider value={{ isConnected, error, subscribe }}>
      {children}
    </SSEContext.Provider>
  )
}

export function useSSEContext() {
  const context = useContext(SSEContext)
  if (!context) {
    throw new Error('useSSEContext must be used within SSEProvider')
  }
  return context
}
```

### 3. Composant Lobby avec SSE

```typescript
// resources/js/pages/Lobbies/Show.tsx
import React, { useEffect, useState } from 'react'
import { useSSEContext } from '../../contexts/SSEContext'

interface LobbyShowProps {
  lobby: LobbyDTO
}

export default function LobbyShow({ lobby: initialLobby }: LobbyShowProps) {
  const [lobby, setLobby] = useState(initialLobby)
  const { subscribe, isConnected } = useSSEContext()

  useEffect(() => {
    // Abonnement aux événements du lobby
    const unsubscribePlayerJoined = subscribe('lobby:player_joined', (data) => {
      if (data.lobbyId === lobby.uuid) {
        setLobby(prev => ({
          ...prev,
          players: [...prev.players, data.player],
          currentPlayers: data.currentPlayers,
          status: data.lobbyStatus
        }))
      }
    })

    const unsubscribePlayerLeft = subscribe('lobby:player_left', (data) => {
      if (data.lobbyId === lobby.uuid) {
        setLobby(prev => ({
          ...prev,
          players: prev.players.filter(p => p.uuid !== data.playerUUID),
          currentPlayers: data.currentPlayers,
          status: data.lobbyStatus
        }))
      }
    })

    const unsubscribeGameStarted = subscribe('game:started', (data) => {
      // Redirection vers la partie
      window.location.href = `/games/${data.gameId}`
    })

    return () => {
      unsubscribePlayerJoined()
      unsubscribePlayerLeft()
      unsubscribeGameStarted()
    }
  }, [lobby.uuid, subscribe])

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{lobby.name}</h1>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connecté' : 'Déconnecté'}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Joueurs ({lobby.currentPlayers}/{lobby.maxPlayers})
            </h2>
            <div className="space-y-2">
              {lobby.players.map(player => (
                <div key={player.uuid} className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {player.nickName.charAt(0).toUpperCase()}
                  </div>
                  <span>{player.nickName}</span>
                  {player.uuid === lobby.createdBy && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Créateur
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
              {lobby.status === 'READY' && lobby.isCreator && (
                <button className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
                  Démarrer la partie
                </button>
              )}
              
              <button className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700">
                Quitter le lobby
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

## Routes SSE

```typescript
// start/routes.ts
import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

// Route SSE (nécessite authentification)
router
  .get('/sse/connect', '#controllers/SSEController.connect')
  .use(middleware.auth())
```

## Gestion des Erreurs et Reconnexion

### Stratégies de Reconnexion

```typescript
// resources/js/utils/sseReconnection.ts
export class SSEReconnectionManager {
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000 // 1 seconde

  async handleReconnection(createConnection: () => EventSource): Promise<EventSource> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error('Max reconnection attempts reached')
    }

    await this.delay(this.reconnectDelay * Math.pow(2, this.reconnectAttempts))
    this.reconnectAttempts++

    return createConnection()
  }

  resetAttempts(): void {
    this.reconnectAttempts = 0
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

## Monitoring et Debug

### Logging des Événements SSE

```typescript
// app/Services/SSELogger.ts
import logger from '@adonisjs/core/services/logger'

export class SSELogger {
  static logConnection(connectionId: string, userUUID: string): void {
    logger.info('SSE connection established', {
      connectionId,
      userUUID,
      timestamp: new Date().toISOString()
    })
  }

  static logDisconnection(connectionId: string, reason?: string): void {
    logger.info('SSE connection closed', {
      connectionId,
      reason,
      timestamp: new Date().toISOString()
    })
  }

  static logBroadcast(event: string, recipientCount: number): void {
    logger.debug('SSE broadcast sent', {
      event,
      recipientCount,
      timestamp: new Date().toISOString()
    })
  }
}
```

## Sécurité SSE

### Authentification des Connexions

```typescript
// app/Middleware/SSEAuthMiddleware.ts
export default class SSEAuthMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    try {
      await auth.check()
      
      if (!auth.user) {
        return response.status(401).json({ error: 'Unauthorized' })
      }
      
      await next()
    } catch (error) {
      return response.status(401).json({ error: 'Authentication required' })
    }
  }
}
```

### Rate Limiting

```typescript
// app/Middleware/SSERateLimitMiddleware.ts
export default class SSERateLimitMiddleware {
  private connections: Map<string, number> = new Map()
  private maxConnectionsPerUser = 3

  async handle({ auth, response }: HttpContext, next: NextFn) {
    const userUUID = auth.user!.uuid
    const currentConnections = this.connections.get(userUUID) || 0

    if (currentConnections >= this.maxConnectionsPerUser) {
      return response.status(429).json({ 
        error: 'Too many SSE connections' 
      })
    }

    this.connections.set(userUUID, currentConnections + 1)
    await next()
  }
}
```

Cette implémentation SSE offre :
- **Communication temps réel** fiable et performante
- **Reconnexion automatique** en cas de perte de connexion
- **Authentification sécurisée** des connexions
- **Diffusion ciblée** (broadcast, utilisateur, groupe)
- **Monitoring complet** des connexions et événements
- **Intégration React** simple avec hooks et context
