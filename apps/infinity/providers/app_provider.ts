import logger from '@adonisjs/core/services/logger'
import { type ApplicationService } from '@adonisjs/core/types'
import { initializeAppGameLauncher } from '#infrastructure/game_engine/app_game_launcher'
import { eventBridgeService } from '#infrastructure/transcript/index'
import { registerAuthOnboardingBindings } from './bindings/auth_onboarding_bindings.js'
import { registerCoreBindings } from './bindings/core_bindings.js'
import { registerGameBindings } from './bindings/game_bindings.js'
import { registerLobbyEntryBindings } from './bindings/lobby_entry_bindings.js'
import { registerLobbyExitBindings } from './bindings/lobby_exit_bindings.js'
import { registerLobbyListingBindings } from './bindings/lobby_listing_bindings.js'
import { registerLobbyManagementBindings } from './bindings/lobby_management_bindings.js'
import { registerLobbyRuntimeBindings } from './bindings/lobby_runtime_bindings.js'
import { registerSocialBindings } from './bindings/social_bindings.js'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Called when the application is ready to accept HTTP requests
   */
  async ready() {
    await initializeAppGameLauncher()
    // Initialize EventBridge to connect domain events to Transmit
    await eventBridgeService.initialize()
    logger.info('[AppProvider] EventBridge initialized')
  }

  /**
   * Called when the application is shutting down
   */
  async shutdown() {
    eventBridgeService.stop()
    logger.info('[AppProvider] EventBridge stopped')
  }

  async register() {
    registerCoreBindings(this.app.container)
    registerLobbyRuntimeBindings(this.app.container)
    registerAuthOnboardingBindings(this.app.container)
    registerLobbyEntryBindings(this.app.container)
    registerLobbyExitBindings(this.app.container)
    registerGameBindings(this.app.container)
    registerLobbyListingBindings(this.app.container)
    registerSocialBindings(this.app.container)
    registerLobbyManagementBindings(this.app.container)
  }
}

/**
 * Define static types for container bindings using TypeScript declaration merging
 */
declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    // Define our custom bindings here if needed
    // For now, we use class constructors directly which don't need explicit typing
  }
}
