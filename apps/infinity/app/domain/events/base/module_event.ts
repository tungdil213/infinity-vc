/**
 * Interface générique pour les événements modulaires
 * Permet de créer des événements pour n'importe quel domaine (lobby, chat, game, etc.)
 */
export interface ModuleEvent<TData = any> {
  /** Nom du module (ex: 'lobby', 'chat', 'game') */
  module: string

  /** Type unique de l'événement (ex: 'created', 'player.joined', 'message.sent') */
  type: string

  /** UUID de l'événement pour traçabilité */
  eventId: string

  /** Données spécifiques à l'événement */
  data: TData

  /** Métadonnées de l'événement */
  metadata: ModuleEventMetadata

  /** Version de l'événement pour compatibilité */
  version: number
}

/**
 * Métadonnées communes à tous les événements modulaires
 */
export interface ModuleEventMetadata {
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
 * Factory pour créer des événements modulaires
 */
export class ModuleEventFactory {
  static create<TData = any>(
    module: string,
    type: string,
    data: TData,
    options?: {
      correlationId?: string
      userContext?: ModuleEventMetadata['userContext']
      parentEventId?: string
      tags?: string[]
    }
  ): ModuleEvent<TData> {
    const eventId = crypto.randomUUID()
    const correlationId = options?.correlationId || eventId

    return {
      module,
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
   * Créer un événement avec un type complet (module.type)
   */
  static createFull<TData = any>(
    fullType: string,
    data: TData,
    options?: Parameters<typeof ModuleEventFactory.create>[3]
  ): ModuleEvent<TData> {
    const [module, ...typeParts] = fullType.split('.')
    const type = typeParts.join('.')
    return this.create(module, type, data, options)
  }

  /**
   * Clone un événement existant avec de nouvelles données (utile pour retry)
   */
  static clone<TData = any>(event: ModuleEvent<TData>, newData?: TData): ModuleEvent<TData> {
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

  /**
   * Obtenir le type complet de l'événement (module.type)
   */
  static getFullType(event: ModuleEvent): string {
    return `${event.module}.${event.type}`
  }
}
