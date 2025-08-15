import { HttpContext } from '@adonisjs/core/http'
import { sseConnectionManager } from '../infrastructure/sse/connection_manager.js'
import { sseService } from '../infrastructure/sse/sse_service.js'
import { inject } from '@adonisjs/core'

@inject()
export default class SSEController {
  /**
   * Establish SSE connection for a user
   * GET /api/v1/sse/connect
   */
  async connect({ request, response, auth }: HttpContext) {
    try {
      // Authenticate user (assuming JWT middleware is applied)
      const user = auth.user
      if (!user) {
        return response.unauthorized({ error: 'Authentication required' })
      }

      // Initialize SSE service if not already done
      await sseService.initialize()

      // Create SSE connection
      const connectionId = sseConnectionManager.addConnection(user.userUuid, response)

      // Auto-subscribe to user's personal channel
      sseService.subscribeToUser(connectionId, user.userUuid)

      console.log(`SSE connection established for user ${user.userUuid}, connection: ${connectionId}`)

      // Keep the connection alive - the response will be handled by the connection manager
      // The connection will be closed when the client disconnects or times out
    } catch (error) {
      console.error('Error establishing SSE connection:', error)
      return response.internalServerError({ error: 'Failed to establish SSE connection' })
    }
  }

  /**
   * Subscribe to a specific channel
   * POST /api/v1/sse/subscribe
   */
  async subscribe({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user
      if (!user) {
        return response.unauthorized({ error: 'Authentication required' })
      }

      const { channel, connectionId } = request.only(['channel', 'connectionId'])

      if (!channel) {
        return response.badRequest({ error: 'Channel is required' })
      }

      // If no connectionId provided, use the most recent connection for this user
      let targetConnectionId = connectionId
      if (!targetConnectionId) {
        const userConnections = sseConnectionManager.getConnectionsByUser(user.uuid)
        if (userConnections.length === 0) {
          return response.badRequest({ error: 'No active SSE connection found' })
        }
        targetConnectionId = userConnections[0].id
      }

      // Verify the connection belongs to the authenticated user
      const connection = sseConnectionManager.getConnection(targetConnectionId)
      if (!connection || connection.userId !== user.userUuid) {
        return response.forbidden({ error: 'Invalid connection' })
      }

      // Authorize channel access
      const authorized = await this.authorizeChannelAccess(user.uuid, channel)
      if (!authorized) {
        return response.forbidden({ error: 'Access denied to this channel' })
      }

      // Subscribe to channel
      const success = this.subscribeToChannelByType(targetConnectionId, channel)
      
      if (success) {
        return response.ok({ 
          message: 'Successfully subscribed to channel',
          channel,
          connectionId: targetConnectionId
        })
      } else {
        return response.badRequest({ error: 'Failed to subscribe to channel' })
      }
    } catch (error) {
      console.error('Error subscribing to channel:', error)
      return response.internalServerError({ error: 'Failed to subscribe to channel' })
    }
  }

  /**
   * Unsubscribe from a specific channel
   * POST /api/v1/sse/unsubscribe
   */
  async unsubscribe({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user
      if (!user) {
        return response.unauthorized({ error: 'Authentication required' })
      }

      const { channel, connectionId } = request.only(['channel', 'connectionId'])

      if (!channel) {
        return response.badRequest({ error: 'Channel is required' })
      }

      // If no connectionId provided, use all connections for this user
      let targetConnectionIds: string[] = []
      if (connectionId) {
        targetConnectionIds = [connectionId]
      } else {
        const userConnections = sseConnectionManager.getConnectionsByUser(user.uuid)
        targetConnectionIds = userConnections.map(conn => conn.id)
      }

      let successCount = 0
      for (const connId of targetConnectionIds) {
        // Verify the connection belongs to the authenticated user
        const connection = sseConnectionManager.getConnection(connId)
        if (connection && connection.userId === user.uuid) {
          const success = this.unsubscribeFromChannelByType(connId, channel)
          if (success) successCount++
        }
      }

      return response.ok({ 
        message: `Successfully unsubscribed from channel`,
        channel,
        connectionsUpdated: successCount
      })
    } catch (error) {
      console.error('Error unsubscribing from channel:', error)
      return response.internalServerError({ error: 'Failed to unsubscribe from channel' })
    }
  }

  /**
   * Get SSE service statistics (admin only)
   * GET /api/v1/sse/stats
   */
  async stats({ response, auth }: HttpContext) {
    try {
      const user = auth.user
      if (!user) {
        return response.unauthorized({ error: 'Authentication required' })
      }

      // TODO: Add admin role check
      // if (!user.isAdmin) {
      //   return response.forbidden({ error: 'Admin access required' })
      // }

      const stats = sseService.getStats()
      return response.ok(stats)
    } catch (error) {
      console.error('Error getting SSE stats:', error)
      return response.internalServerError({ error: 'Failed to get SSE stats' })
    }
  }

  /**
   * Authorize channel access for a user
   */
  private async authorizeChannelAccess(userUuid: string, channel: string): Promise<boolean> {
    // Parse channel type and ID
    const [channelType, channelId] = channel.split(':')

    switch (channelType) {
      case 'user':
        // Users can only access their own user channel
        return channelId === userUuid

      case 'lobby':
        // TODO: Check if user is in the lobby
        // For now, allow access to any lobby (will be restricted by business logic)
        return true

      case 'game':
        // TODO: Check if user is in the game
        // For now, allow access to any game (will be restricted by business logic)
        return true

      case 'global':
        // All authenticated users can access global channel
        return true

      case 'system':
        // TODO: Add admin role check
        // For now, allow all users
        return true

      default:
        return false
    }
  }

  /**
   * Subscribe to channel based on channel type
   */
  private subscribeToChannelByType(connectionId: string, channel: string): boolean {
    const [channelType, channelId] = channel.split(':')

    switch (channelType) {
      case 'user':
        return sseService.subscribeToUser(connectionId, channelId)
      case 'lobby':
        return sseService.subscribeToLobby(connectionId, channelId)
      case 'game':
        return sseService.subscribeToGame(connectionId, channelId)
      default:
        // For global, system, and other channels, use the channel manager directly
        return sseService.subscribeToUser(connectionId, channel) // This will create the channel if needed
    }
  }

  /**
   * Unsubscribe from channel based on channel type
   */
  private unsubscribeFromChannelByType(connectionId: string, channel: string): boolean {
    const [channelType, channelId] = channel.split(':')

    switch (channelType) {
      case 'user':
        return sseService.unsubscribeFromUser(connectionId, channelId)
      case 'lobby':
        return sseService.unsubscribeFromLobby(connectionId, channelId)
      case 'game':
        return sseService.unsubscribeFromGame(connectionId, channelId)
      default:
        // For global, system, and other channels, use the channel manager directly
        return sseService.unsubscribeFromUser(connectionId, channel)
    }
  }
}
