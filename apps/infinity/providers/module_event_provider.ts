import type { ApplicationService } from '@adonisjs/core/types'
import { ModuleEventRegistry } from '#domain/events/base/module_event_registry'
import { LobbyTransmitBridge } from '#domain/events/modules/lobby/lobby_transmit_bridge'
import { ChatTransmitBridge } from '#domain/events/modules/chat/chat_transmit_bridge'
import { GameTransmitBridge } from '#domain/events/modules/game/game_transmit_bridge'

/**
 * Provider pour initialiser automatiquement les bridges d'événements
 */
export default class ModuleEventProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * S'exécute au démarrage de l'application
   */
  async boot() {
    const registry = ModuleEventRegistry.getInstance()

    // Enregistrer tous les bridges Transmit par module
    registry.register(new LobbyTransmitBridge())
    registry.register(new ChatTransmitBridge())
    registry.register(new GameTransmitBridge())

    console.log('✅ Module Event Bridges registered:', registry.getStats())
  }
}
