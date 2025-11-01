/**
 * Interface de base pour tous les événements du domaine
 * Centralise la structure commune des événements dans l'architecture Event-Driven
 */
export interface DomainEvent {
  /** Type unique de l'événement (ex: 'lobby.created', 'player.joined') */
  type: string

  /** UUID de l'événement pour traçabilité */
  eventId: string

  /** Données spécifiques à l'événement */
  data: Record<string, any>

  /** Métadonnées de l'événement */
  metadata: EventMetadata

  /** Version de l'événement pour compatibilité */
  version: number
}

/**
 * Métadonnées communes à tous les événements
 */
export interface EventMetadata {
  /** Horodatage de création de l'événement */
  timestamp: Date

  /** ID de corrélation pour suivre les flux d'événements liés */
  correlationId: string

  /** Contexte utilisateur qui a déclenché l'événement */
  userContext?: {
    userUuid: string
    sessionId?: string
    ipAddress?: string
  }

  /** Nombre de tentatives de traitement (pour retry logic) */
  retryCount: number

  /** Événement parent si cet événement est déclenché par un autre */
  parentEventId?: string

  /** Tags additionnels pour filtrage et recherche */
  tags: string[]
}

/**
 * Result du traitement d'un événement par un handler
 */
export interface EventHandlingResult {
  /** Nom du handler qui a traité l'événement */
  handlerName: string

  /** Succès ou échec du traitement */
  success: boolean

  /** Message de résultat ou d'erreur */
  message?: string

  /** Données retournées par le handler */
  data?: any

  /** Durée de traitement en millisecondes */
  processingTimeMs: number

  /** Événements générés par ce handler */
  generatedEvents?: DomainEvent[]
}

/**
 * Factory pour créer des événements avec métadonnées automatiques
 */
export class DomainEventFactory {
  static create(
    type: string,
    data: Record<string, any>,
    options?: {
      correlationId?: string
      userContext?: EventMetadata['userContext']
      parentEventId?: string
      tags?: string[]
    }
  ): DomainEvent {
    const eventId = crypto.randomUUID()
    const correlationId = options?.correlationId || eventId

    return {
      type,
      eventId,
      data,
      version: 1,
      metadata: {
        timestamp: new Date(),
        correlationId,
        userContext: options?.userContext,
        retryCount: 0,
        parentEventId: options?.parentEventId,
        tags: options?.tags || [],
      },
    }
  }

  /**
   * Clone un événement existant avec de nouvelles données (utile pour retry)
   */
  static clone(event: DomainEvent, newData?: any): DomainEvent {
    return {
      ...event,
      eventId: crypto.randomUUID(),
      data: newData || event.data,
      metadata: {
        ...event.metadata,
        timestamp: new Date(),
        retryCount: event.metadata.retryCount + 1,
      },
    }
  }
}
