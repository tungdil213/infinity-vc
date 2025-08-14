import { BaseEntity } from './base_entity.js'
import { PlayerInterface } from '../interfaces/player_interface.js'
import { LobbyStatus } from '../value_objects/lobby_status.js'
import {
  LobbyCreatedEvent,
  PlayerJoinedLobbyEvent,
  PlayerLeftLobbyEvent,
} from '../events/lobby_events.js'
import LobbyStateMachine, { LobbyEvent } from '../state_machine/lobby_state_machine.js'
import { OperationResult, OperationResultFactory } from '../value_objects/operation_result.js'

export interface LobbyData {
  uuid?: string
  name: string
  creator: PlayerInterface
  maxPlayers?: number
  isPrivate?: boolean
}

export default class Lobby extends BaseEntity {
  private _stateMachine: LobbyStateMachine
  private _players: PlayerInterface[] = []

  private constructor(
    private _uuid: string,
    private _name: string,
    private _createdBy: string,
    private _maxPlayers: number = 4,
    private _isPrivate: boolean = false,
    private _createdAt: Date = new Date()
  ) {
    super()
    this._stateMachine = new LobbyStateMachine(LobbyStatus.OPEN, _maxPlayers)
  }

  static create(data: LobbyData): Lobby {
    const uuid = data.uuid || crypto.randomUUID()

    // Validation
    Lobby.validateName(data.name)
    Lobby.validateMaxPlayers(data.maxPlayers || 4)

    const lobby = new Lobby(
      uuid,
      data.name.trim(),
      data.creator.uuid,
      data.maxPlayers || 4,
      data.isPrivate || false
    )

    // Ajouter le créateur comme premier joueur
    lobby._players = [data.creator]
    lobby._stateMachine.updatePlayerCount(1)

    // Enregistrer l'événement de création
    lobby.recordEvent(
      new LobbyCreatedEvent(lobby._uuid, lobby._name, lobby._createdBy, lobby._maxPlayers)
    )

    return lobby
  }

  static reconstitute(
    uuid: string,
    name: string,
    createdBy: string,
    players: PlayerInterface[],
    maxPlayers: number = 4,
    isPrivate: boolean = false,
    createdAt?: Date
  ): Lobby {
    const lobby = new Lobby(uuid, name, createdBy, maxPlayers, isPrivate, createdAt || new Date())

    lobby._players = [...players]
    lobby._stateMachine.updatePlayerCount(players.length)

    return lobby
  }

  // Getters
  get uuid(): string {
    return this._uuid
  }

  get name(): string {
    return this._name
  }

  get createdBy(): string {
    return this._createdBy
  }

  get creator(): PlayerInterface {
    return this._players.find((p) => p.uuid === this._createdBy)!
  }

  get players(): PlayerInterface[] {
    return [...this._players]
  }

  get playerCount(): number {
    return this._players.length
  }

  get maxPlayers(): number {
    return this._maxPlayers
  }

  get isPrivate(): boolean {
    return this._isPrivate
  }

  get status(): LobbyStatus {
    return this._stateMachine.getCurrentState()
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get canStart(): boolean {
    return this._stateMachine.canStartGame()
  }

  get availableActions(): LobbyEvent[] {
    return this._stateMachine.getValidTransitions()
  }

  get hasAvailableSlots(): boolean {
    return this._players.length < this._maxPlayers
  }

  // Methods
  addPlayer(player: PlayerInterface): OperationResult {
    try {
      // Validation métier
      this.validateCanAddPlayer(player)

      // Faire la transition AVANT d'ajouter le joueur (pour que les guards fonctionnent)
      this._stateMachine.transition(LobbyEvent.PLAYER_JOINED)

      // Ajout du joueur
      this._players.push(player)

      // Mise à jour de la machine à états
      this._stateMachine.updatePlayerCount(this._players.length)

      // Événement domaine
      this.recordEvent(
        new PlayerJoinedLobbyEvent(this._uuid, player, this._players.length, this.status)
      )

      return OperationResultFactory.success()
    } catch (error) {
      return OperationResultFactory.failure(error.message)
    }
  }

  removePlayer(playerUuid: string): OperationResult {
    try {
      const playerIndex = this._players.findIndex((p) => p.uuid === playerUuid)

      if (playerIndex === -1) {
        return OperationResultFactory.failure('Player not found in lobby')
      }

      // Vérifier si c'est le créateur et s'il y a d'autres joueurs
      if (playerUuid === this._createdBy && this._players.length > 1) {
        return OperationResultFactory.failure(
          'Creator cannot leave lobby while other players are present'
        )
      }

      // Capturer le joueur avant suppression pour l'événement
      const removedPlayer = this._players[playerIndex]

      // Faire la transition AVANT de supprimer le joueur (pour que les guards fonctionnent)
      this._stateMachine.transition(LobbyEvent.PLAYER_LEFT)

      // Suppression du joueur
      this._players.splice(playerIndex, 1)

      // Mise à jour de la machine à états
      this._stateMachine.updatePlayerCount(this._players.length)

      // Si c'était le dernier joueur, le lobby doit être supprimé
      if (this._players.length === 0) {
        // Événement domaine pour le dernier joueur qui quitte
        this.recordEvent(
          new PlayerLeftLobbyEvent(this._uuid, removedPlayer, this._players.length, this.status)
        )
        // Le lobby sera supprimé par le service
        return OperationResultFactory.success()
      }

      // Si le créateur quitte, transférer la propriété
      if (playerUuid === this._createdBy && this._players.length > 0) {
        this._createdBy = this._players[0].uuid
      }

      // Événement domaine
      this.recordEvent(
        new PlayerLeftLobbyEvent(this._uuid, removedPlayer, this._players.length, this.status)
      )

      return OperationResultFactory.success()
    } catch (error) {
      return OperationResultFactory.failure(error.message)
    }
  }

  startGame(): OperationResult<string> {
    try {
      if (!this.canStart) {
        return OperationResultFactory.failure('Lobby must be READY or FULL to start game')
      }

      // Transition vers STARTING
      this._stateMachine.transition(LobbyEvent.GAME_STARTED)

      // Génération de l'UUID de la partie
      const gameUuid = crypto.randomUUID()

      // Enregistrer l'événement de domaine
      this.recordEvent({
        eventType: 'GameStarted',
        lobbyUuid: this._uuid,
        gameUuid: gameUuid,
        players: this._players.map((p) => ({ uuid: p.uuid, nickName: p.nickName })),
        timestamp: new Date(),
      })

      return OperationResultFactory.success(gameUuid)
    } catch (error) {
      return OperationResultFactory.failure(error.message)
    }
  }

  setReady(): OperationResult {
    try {
      if (this._players.length < 2) {
        return OperationResultFactory.failure('Need at least 2 players to be ready')
      }

      this._stateMachine.transition(LobbyEvent.READY_SET)
      return OperationResultFactory.success()
    } catch (error) {
      return OperationResultFactory.failure(error.message)
    }
  }

  // Utility methods
  hasPlayer(playerUuid: string): boolean {
    return this._players.some((p) => p.uuid === playerUuid)
  }

  isCreatedBy(playerUuid: string): boolean {
    return this._createdBy === playerUuid
  }

  isOpen(): boolean {
    return [LobbyStatus.OPEN, LobbyStatus.WAITING, LobbyStatus.READY].includes(this.status)
  }

  isFull(): boolean {
    return this._players.length >= this._maxPlayers
  }

  private validateCanAddPlayer(player: PlayerInterface): void {
    if (this.hasPlayer(player.uuid)) {
      throw new Error('Player is already in the lobby')
    }

    if (this.isFull()) {
      throw new Error('Lobby is full')
    }

    if (!this._stateMachine.canTransition(LobbyEvent.PLAYER_JOINED)) {
      throw new Error('Lobby is full')
    }
  }

  // Validation methods
  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Lobby name cannot be empty')
    }
    if (name.trim().length < 3 || name.trim().length > 50) {
      throw new Error('Lobby name must be between 3 and 50 characters')
    }
  }

  private static validateMaxPlayers(maxPlayers: number): void {
    if (maxPlayers < 2 || maxPlayers > 8) {
      throw new Error('Max players must be between 2 and 8')
    }
  }

  // Serialization
  toJSON() {
    return {
      uuid: this._uuid,
      name: this._name,
      creator: this.creator,
      players: this._players,
      maxPlayers: this._maxPlayers,
      currentPlayers: this._players.length,
      isPrivate: this._isPrivate,
      status: this.status,
      createdAt: this._createdAt,
    }
  }
}
