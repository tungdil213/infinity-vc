/**
 * Classe de base simple pour les événements de domaine
 * Utilisée pour la compatibilité avec l'ancien système d'événements
 */
export abstract class BaseDomainEvent {
  public readonly timestamp: Date

  constructor(timestamp?: Date) {
    this.timestamp = timestamp || new Date()
  }

  abstract readonly eventType: string
}
