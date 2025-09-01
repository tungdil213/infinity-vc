import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { lobbySSEAdapter } from '../infrastructure/sse/lobby_sse_adapter.js'
import { sseConnectionManager } from '../infrastructure/sse/connection_manager.js'
import type { SSEConnection } from '../infrastructure/sse/types.js'

/**
 * Contrôleur pour la synchronisation temps réel des lobbies
 * Gère les connexions SSE spécifiques aux lobbies et la diffusion d'événements
 */
@inject()
export default class LobbySyncController {
  /**
   * S'abonner aux événements d'un lobby spécifique
   * POST /api/v1/lobbies/:lobbyUuid/subscribe
   */
  async subscribeLobby({ request, response, auth, params }: HttpContext) {
    try {
      const user = auth.user
      if (!user) {
        return response.unauthorized({ error: 'Authentication required' })
      }

      const { lobbyUuid } = params
      const { connectionId } = request.only(['connectionId'])

      if (!lobbyUuid) {
        return response.badRequest({ error: 'Lobby UUID is required' })
      }

      // Si aucun connectionId fourni, utiliser la connexion la plus récente de l'utilisateur
      let targetConnectionId = connectionId
      if (!targetConnectionId) {
        const userConnections = sseConnectionManager.getConnectionsByUser(user.userUuid)
        if (userConnections.length === 0) {
          return response.badRequest({ 
            error: 'No active SSE connection found. Please establish an SSE connection first.' 
          })
        }
        targetConnectionId = userConnections[0].id
      }

      // Vérifier que la connexion appartient à l'utilisateur authentifié
      const connection = sseConnectionManager.getConnection(targetConnectionId)
      if (!connection || connection.userId !== user.userUuid) {
        return response.forbidden({ error: 'Invalid connection' })
      }

      // TODO: Vérifier que l'utilisateur a accès au lobby
      // const hasAccess = await this.checkLobbyAccess(user.userUuid, lobbyUuid)
      // if (!hasAccess) {
      //   return response.forbidden({ error: 'Access denied to this lobby' })
      // }

      // S'abonner aux événements du lobby
      const success = await lobbySSEAdapter.subscribeLobbyConnection(targetConnectionId, lobbyUuid)
      
      if (success) {
        return response.ok({
          message: 'Successfully subscribed to lobby events',
          lobbyUuid,
          connectionId: targetConnectionId
        })
      } else {
        return response.internalServerError({ error: 'Failed to subscribe to lobby events' })
      }
    } catch (error) {
      console.error('Error subscribing to lobby events:', error)
      return response.internalServerError({ error: 'Failed to subscribe to lobby events' })
    }
  }

  /**
   * Se désabonner des événements d'un lobby
   * POST /api/v1/lobbies/:lobbyUuid/unsubscribe
   */
  async unsubscribeLobby({ request, response, auth, params }: HttpContext) {
    try {
      const user = auth.user
      if (!user) {
        return response.unauthorized({ error: 'Authentication required' })
      }

      const { lobbyUuid } = params
      const { connectionId } = request.only(['connectionId'])

      if (!lobbyUuid) {
        return response.badRequest({ error: 'Lobby UUID is required' })
      }

      // Si aucun connectionId fourni, désabonner toutes les connexions de l'utilisateur
      let targetConnectionIds: string[] = []
      if (connectionId) {
        targetConnectionIds = [connectionId]
      } else {
        const userConnections = sseConnectionManager.getConnectionsByUser(user.userUuid)
        targetConnectionIds = userConnections.map(conn => conn.id)
      }

      let successCount = 0
      for (const connId of targetConnectionIds) {
        // Vérifier que la connexion appartient à l'utilisateur authentifié
        const connection = sseConnectionManager.getConnection(connId)
        if (connection && connection.userId === user.userUuid) {
          const success = await lobbySSEAdapter.unsubscribeLobbyConnection(connId, lobbyUuid)
          if (success) successCount++
        }
      }

      return response.ok({
        message: 'Successfully unsubscribed from lobby events',
        lobbyUuid,
        connectionsUpdated: successCount
      })
    } catch (error) {
      console.error('Error unsubscribing from lobby events:', error)
      return response.internalServerError({ error: 'Failed to unsubscribe from lobby events' })
    }
  }

  /**
   * Obtenir l'état actuel d'un lobby (snapshot)
   * GET /api/v1/lobbies/:lobbyUuid/state
   */
  async getLobbyState({ response, auth, params }: HttpContext) {
    try {
      const user = auth.user
      if (!user) {
        return response.unauthorized({ error: 'Authentication required' })
      }

      const { lobbyUuid } = params

      if (!lobbyUuid) {
        return response.badRequest({ error: 'Lobby UUID is required' })
      }

      // TODO: Implémenter la récupération de l'état du lobby
      // const lobbyRepository = container.resolve('LobbyRepository')
      // const lobby = await lobbyRepository.findByUuid(lobbyUuid)
      // 
      // if (!lobby) {
      //   return response.notFound({ error: 'Lobby not found' })
      // }
      //
      // // Vérifier l'accès au lobby
      // const hasAccess = await this.checkLobbyAccess(user.userUuid, lobbyUuid)
      // if (!hasAccess) {
      //   return response.forbidden({ error: 'Access denied to this lobby' })
      // }

      // Pour l'instant, retourner un état fictif
      const lobbyState = {
        uuid: lobbyUuid,
        name: 'Sample Lobby',
        status: 'waiting',
        players: [
          { uuid: user.userUuid, nickName: user.nickName || 'Player 1' }
        ],
        maxPlayers: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      return response.ok({
        lobby: lobbyState,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error getting lobby state:', error)
      return response.internalServerError({ error: 'Failed to get lobby state' })
    }
  }

  /**
   * Obtenir les statistiques de synchronisation des lobbies
   * GET /api/v1/lobbies/sync/stats
   */
  async getSyncStats({ response, auth }: HttpContext) {
    try {
      const user = auth.user
      if (!user) {
        return response.unauthorized({ error: 'Authentication required' })
      }

      // TODO: Ajouter une vérification de rôle admin
      // if (!user.isAdmin) {
      //   return response.forbidden({ error: 'Admin access required' })
      // }

      // Obtenir les statistiques des connexions SSE
      const allConnections = sseConnectionManager.getAllConnections()
      const lobbyConnections = allConnections.filter((conn: SSEConnection) => conn.metadata?.lobbyId)
      
      // Grouper par lobby
      const lobbyStats = new Map<string, number>()
      for (const conn of lobbyConnections) {
        const lobbyId = conn.metadata?.lobbyId
        if (lobbyId) {
          lobbyStats.set(lobbyId, (lobbyStats.get(lobbyId) || 0) + 1)
        }
      }

      const stats = {
        totalConnections: allConnections.length,
        lobbyConnections: lobbyConnections.length,
        activeLobbies: lobbyStats.size,
        lobbyConnectionCounts: Object.fromEntries(lobbyStats),
        timestamp: new Date().toISOString()
      }

      return response.ok(stats)
    } catch (error) {
      console.error('Error getting sync stats:', error)
      return response.internalServerError({ error: 'Failed to get sync stats' })
    }
  }

  /**
   * Diffuser un événement de test à un lobby (développement uniquement)
   * POST /api/v1/lobbies/:lobbyUuid/test-event
   */
  async sendTestEvent({ request, response, auth, params }: HttpContext) {
    try {
      const user = auth.user
      if (!user) {
        return response.unauthorized({ error: 'Authentication required' })
      }

      // TODO: Activer uniquement en mode développement
      // if (process.env.NODE_ENV === 'production') {
      //   return response.forbidden({ error: 'Test events not available in production' })
      // }

      const { lobbyUuid } = params
      const { eventType, data } = request.only(['eventType', 'data'])

      if (!lobbyUuid || !eventType) {
        return response.badRequest({ error: 'Lobby UUID and event type are required' })
      }

      // Créer un événement de test
      const testEvent = {
        type: eventType,
        lobbyUuid,
        data: data || { message: 'Test event', timestamp: new Date().toISOString() },
        timestamp: new Date()
      }

      // Diffuser l'événement via l'adaptateur
      lobbySSEAdapter.broadcast(testEvent)

      return response.ok({
        message: 'Test event sent successfully',
        event: testEvent
      })
    } catch (error) {
      console.error('Error sending test event:', error)
      return response.internalServerError({ error: 'Failed to send test event' })
    }
  }

  /**
   * Vérifier l'accès d'un utilisateur à un lobby (méthode privée)
   * TODO: Implémenter la logique métier réelle
   */
  private async checkLobbyAccess(_userUuid: string, _lobbyUuid: string): Promise<boolean> {
    // Pour l'instant, autoriser l'accès à tous les lobbies
    // Dans une implémentation réelle, vérifier si l'utilisateur est membre du lobby
    return true
  }
}
