/**
 * Classification des erreurs pour la sécurité et l'expérience utilisateur
 */
export enum ErrorClassification {
  /**
   * Erreurs affichables à l'utilisateur final
   * Messages génériques et sécurisés
   */
  USER_SAFE = 'user_safe',

  /**
   * Erreurs techniques internes
   * Logs détaillés pour les développeurs
   */
  INTERNAL = 'internal',

  /**
   * Erreurs sensibles de sécurité
   * Logs sécurisés, messages génériques pour l'utilisateur
   */
  SECURITY = 'security',
}

/**
 * Niveau de sévérité pour les logs et le monitoring
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Types de toast pour l'interface utilisateur
 */
export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Métadonnées pour l'erreur
 */
export interface ErrorMetadata {
  /** Classification de l'erreur */
  classification: ErrorClassification
  /** Sévérité pour les logs */
  severity: ErrorSeverity
  /** Message affiché à l'utilisateur */
  userMessage: string
  /** Message technique pour les logs */
  technicalMessage: string
  /** Type de toast à afficher */
  toastType: ToastType
  /** Données contextuelles pour Sentry */
  context?: Record<string, any>
  /** Tags pour le monitoring */
  tags?: string[]
  /** Indique si l'erreur doit être reportée à Sentry */
  reportToSentry?: boolean
}
