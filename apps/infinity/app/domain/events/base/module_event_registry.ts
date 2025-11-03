import type { ModuleEventBridge } from './module_event_bridge.js'
import type { ModuleEvent } from './module_event.js'

/**
 * Registre global pour tous les bridges d'événements modulaires
 * Pattern Singleton pour gérer l'enregistrement des bridges par module
 */
export class ModuleEventRegistry {
  private static instance: ModuleEventRegistry | null = null
  private bridges = new Map<string, ModuleEventBridge>()

  private constructor() {}

  static getInstance(): ModuleEventRegistry {
    if (!ModuleEventRegistry.instance) {
      ModuleEventRegistry.instance = new ModuleEventRegistry()
    }
    return ModuleEventRegistry.instance
  }

  /**
   * Enregistrer un bridge pour un module
   */
  register(bridge: ModuleEventBridge): void {
    if (this.bridges.has(bridge.moduleName)) {
      console.warn(
        `⚠️ ModuleEventRegistry: Bridge for module "${bridge.moduleName}" already registered. Overwriting.`
      )
    }

    this.bridges.set(bridge.moduleName, bridge)
    console.log(`✅ ModuleEventRegistry: Registered bridge for module "${bridge.moduleName}"`)
  }

  /**
   * Désenregistrer un bridge
   */
  unregister(moduleName: string): void {
    if (this.bridges.delete(moduleName)) {
      console.log(`🗑️ ModuleEventRegistry: Unregistered bridge for module "${moduleName}"`)
    }
  }

  /**
   * Obtenir un bridge par nom de module
   */
  getBridge(moduleName: string): ModuleEventBridge | undefined {
    return this.bridges.get(moduleName)
  }

  /**
   * Obtenir tous les bridges enregistrés
   */
  getAllBridges(): ModuleEventBridge[] {
    return Array.from(this.bridges.values()).sort((a, b) => a.priority - b.priority)
  }

  /**
   * Trouver les bridges capables de gérer un événement
   */
  findBridgesForEvent(event: ModuleEvent): ModuleEventBridge[] {
    return this.getAllBridges().filter((bridge) => bridge.canHandle(event))
  }

  /**
   * Diffuser un événement via tous les bridges capables de le gérer
   */
  async broadcast(event: ModuleEvent): Promise<void> {
    const bridges = this.findBridgesForEvent(event)

    if (bridges.length === 0) {
      console.warn(
        `⚠️ ModuleEventRegistry: No bridge found for event ${event.module}.${event.type}`
      )
      return
    }

    const results = await Promise.allSettled(bridges.map((bridge) => bridge.handle(event)))

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `❌ ModuleEventRegistry: Bridge "${bridges[index].moduleName}" failed:`,
          result.reason
        )
      }
    })
  }

  /**
   * Réinitialiser le registre (utile pour les tests)
   */
  reset(): void {
    this.bridges.clear()
    console.log('🔄 ModuleEventRegistry: Reset complete')
  }

  /**
   * Obtenir les statistiques du registre
   */
  getStats() {
    return {
      totalBridges: this.bridges.size,
      modules: Array.from(this.bridges.keys()),
    }
  }
}

/**
 * Helper pour obtenir l'instance du registre
 */
export function getModuleEventRegistry(): ModuleEventRegistry {
  return ModuleEventRegistry.getInstance()
}
