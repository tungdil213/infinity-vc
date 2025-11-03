/**
 * Interface de base pour tous les plugins de jeux
 * Chaque jeu doit implémenter cette interface pour être chargeable dynamiquement
 */
export interface GamePlugin<TState = any, TAction = any> {
  /** Identifiant unique du jeu (ex: 'tic-tac-toe', 'chess', 'poker') */
  readonly id: string

  /** Nom d'affichage du jeu */
  readonly name: string

  /** Description du jeu */
  readonly description: string

  /** Version du plugin */
  readonly version: string

  /** Nombre minimum de joueurs */
  readonly minPlayers: number

  /** Nombre maximum de joueurs */
  readonly maxPlayers: number

  /** Durée estimée d'une partie (en minutes) */
  readonly estimatedDuration: number

  /** Tags pour filtrage (ex: ['strategy', 'multiplayer', 'turn-based']) */
  readonly tags: string[]

  /** Configuration par défaut du jeu */
  readonly defaultConfig: GameConfig

  /**
   * Initialise l'état du jeu avec les joueurs
   */
  initializeState(playerUuids: string[], config?: Partial<GameConfig>): TState

  /**
   * Valide une action de joueur
   */
  validateAction(state: TState, playerUuid: string, action: TAction): GameValidationResult

  /**
   * Applique une action au state et retourne le nouveau state
   */
  applyAction(state: TState, playerUuid: string, action: TAction): TState

  /**
   * Vérifie si le jeu est terminé
   */
  isGameFinished(state: TState): boolean

  /**
   * Obtient le gagnant (si le jeu est terminé)
   */
  getWinner(state: TState): string | null

  /**
   * Sérialise l'état pour la persistance
   */
  serializeState(state: TState): string

  /**
   * Désérialise l'état depuis la persistance
   */
  deserializeState(serialized: string): TState

  /**
   * Obtient le joueur dont c'est le tour (pour jeux tour par tour)
   */
  getCurrentPlayer?(state: TState): string | null

  /**
   * Calcule les actions disponibles pour un joueur
   */
  getAvailableActions?(state: TState, playerUuid: string): TAction[]
}

/**
 * Configuration générique d'un jeu
 */
export interface GameConfig {
  /** Temps de réflexion par tour (en secondes) */
  turnTimeLimit?: number

  /** Activer le mode spectateur */
  allowSpectators?: boolean

  /** Configuration personnalisée du jeu */
  custom?: Record<string, any>
}

/**
 * Résultat de la validation d'une action
 */
export interface GameValidationResult {
  valid: boolean
  error?: string
  code?: string
}

/**
 * Métadonnées d'un plugin de jeu
 */
export interface GamePluginMetadata {
  id: string
  name: string
  description: string
  version: string
  minPlayers: number
  maxPlayers: number
  estimatedDuration: number
  tags: string[]
  thumbnail?: string
  author?: string
  license?: string
}

/**
 * Helper pour créer un résultat de validation
 */
export const GameValidation = {
  valid(): GameValidationResult {
    return { valid: true }
  },

  invalid(error: string, code?: string): GameValidationResult {
    return { valid: false, error, code }
  },
}
