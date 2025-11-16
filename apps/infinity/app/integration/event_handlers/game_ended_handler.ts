import { inject } from '@adonisjs/core'
import type { DomainEvent } from '#shared_kernel/domain/events/domain_event'
import { createContextLogger } from '#infrastructure/logging/logger'

const logger = createContextLogger('GameEndedHandler')

/**
 * Cross-Domain Event Handler
 * Écoute game.ended/game.completed et met à jour le lobby associé
 *
 * Flow: Game terminé → Update Lobby status → Notification joueurs
 */
@inject()
export class GameEndedHandler {
  constructor() {}

  /**
   * Handle un événement de fin de partie
   * Compatible avec EventHandler: (event: DomainEvent) => Promise<void> | void
   */
  async handle(event: DomainEvent): Promise<void> {
    try {
      const { gameId, gameUuid, winnerUuid, reason } = event.payload

      logger.info(
        {
          eventId: event.eventId,
          eventName: event.eventName,
          gameId: gameId || gameUuid,
          winnerUuid,
          reason,
        },
        'Handling game ended event'
      )

      // TODO Phase 3: Implémenter la logique complète
      // 1. Trouver le lobby associé au jeu (via LobbyRepository)
      // 2. Mettre à jour le statut du lobby (FINISHED)
      // 3. Les événements du lobby seront automatiquement diffusés via EventBus
      // 4. Optionnel: Envoyer notifications aux joueurs

      /**
       * Exemple d'implémentation future:
       *
       * const lobby = await this.lobbyRepository.findByGameId(gameId)
       * if (!lobby) {
       *   logger.warn({ gameId }, 'No lobby found for game')
       *   return
       * }
       *
       * lobby.markAsFinished()
       * await this.lobbyRepository.save(lobby)
       *
       * // EventBus publiera automatiquement lobby.status.changed
       */

      logger.info({ gameId: gameId || gameUuid }, 'Game ended event handled (basic implementation)')
    } catch (error) {
      logger.error(
        { error, eventId: event.eventId, eventName: event.eventName },
        'Failed to handle game ended event'
      )
      // Ne pas rejeter - on ne veut pas bloquer les autres handlers
    }
  }
}
