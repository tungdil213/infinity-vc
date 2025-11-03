import type { ModuleEvent } from './module_event.js'

/**
 * Interface pour les bridges de transmission d'événements par module
 */
export interface ModuleEventBridge {
  /** Nom du module géré par ce bridge */
  readonly moduleName: string

  /** Priorité de traitement (plus petit = plus prioritaire) */
  readonly priority: number

  /**
   * Détermine si ce bridge peut gérer un événement
   */
  canHandle(event: ModuleEvent): boolean

  /**
   * Traite l'événement et le diffuse
   */
  handle(event: ModuleEvent): Promise<void>

  /**
   * Obtient les canaux de diffusion pour un événement
   */
  getChannels(event: ModuleEvent): string[]

  /**
   * Convertit l'événement en données transmissibles
   */
  transformEvent(event: ModuleEvent): Record<string, any>
}

/**
 * Bridge abstrait pour faciliter l'implémentation de nouveaux bridges
 */
export abstract class BaseModuleEventBridge implements ModuleEventBridge {
  abstract readonly moduleName: string
  abstract readonly priority: number

  canHandle(event: ModuleEvent): boolean {
    return event.module === this.moduleName && this.shouldBroadcast(event)
  }

  abstract handle(event: ModuleEvent): Promise<void>
  abstract getChannels(event: ModuleEvent): string[]
  abstract transformEvent(event: ModuleEvent): Record<string, any>

  /**
   * Détermine si un événement doit être diffusé
   * Override cette méthode pour filtrer les événements
   */
  protected shouldBroadcast(_event: ModuleEvent): boolean {
    return true
  }

  /**
   * Crée les données de base pour la transmission
   */
  protected createBaseTransmitData(event: ModuleEvent): Record<string, any> {
    return {
      type: `${event.module}.${event.type}`,
      eventId: event.eventId,
      timestamp: event.metadata.timestamp.toISOString(),
      correlationId: event.metadata.correlationId,
    }
  }
}

/**
 * Configuration pour un bridge modulaire
 */
export interface ModuleBridgeConfig {
  /** Activer le retry en cas d'échec */
  enableRetry?: boolean
  /** Nombre maximum de tentatives */
  maxRetries?: number
  /** Délai entre les tentatives (ms) */
  retryDelayMs?: number
  /** Types d'événements à diffuser (si vide, tous sont diffusés) */
  broadcastableEvents?: string[]
  /** Canaux spécifiques par type d'événement */
  channelMapping?: Record<string, string[]>
}
