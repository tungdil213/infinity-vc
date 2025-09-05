import { BaseEntity } from './base_entity.js'
import { LobbyStatus } from '../value_objects/lobby_status.js'
import { PlayerInterface } from '../interfaces/player_interface.js'
import { LobbyValidationException } from '../../exceptions/domain_exceptions.js'
import { Result } from '../shared/result.js'
import {
  LobbyCreatedEvent,
  PlayerJoinedLobbyEvent,
  PlayerLeftLobbyEvent,
} from '../events/lobby_events.js'

export interface LobbyData {
  uuid?: string
  name: string
  creator: PlayerInterface
  maxPlayers?: number
  isPrivate?: boolean
}

export default class Lobby extends BaseEntity {
  private _status: LobbyStatus = LobbyStatus.OPEN
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
    this._status = LobbyStatus.OPEN
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

    // Mettre à jour le statut initial basé sur le nombre de joueurs
    lobby.updateStatusBasedOnPlayerCount()

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
    return this._status
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get canStart(): boolean {
    return this._players.length >= 2 && [LobbyStatus.READY, LobbyStatus.FULL].includes(this._status)
  }

  get availableActions(): string[] {
    const actions: string[] = []
    if (this.canStart) actions.push('START_GAME')
    if (this.hasAvailableSlots) actions.push('ADD_PLAYER')
    return actions
  }

  get hasAvailableSlots(): boolean {
    return this._players.length < this._maxPlayers
  }

  // Methods
  addPlayer(player: PlayerInterface): Result<void> {
    try {
      // Validation métier
      this.validateCanAddPlayer(player)

      // Ajout du joueur
      this._players.push(player)

      // Mise à jour automatique du statut
      this.updateStatusBasedOnPlayerCount()

      // Événement domaine
      this.recordEvent(
        new PlayerJoinedLobbyEvent(this._uuid, player, this._players.length, this.status)
      )

      return Result.ok(undefined)
    } catch (error) {
      if (error instanceof LobbyValidationException) {
        return Result.fail(error.metadata.userMessage)
      }
      return Result.fail('Failed to add player to lobby')
    }
  }

  removePlayer(playerUuid: string): Result<void> {
    try {
      const playerIndex = this._players.findIndex((p) => p.uuid === playerUuid)

      if (playerIndex === -1) {
        return Result.fail('Player not found in lobby')
      }

      // Vérifier si c'est le créateur et s'il y a d'autres joueurs
      if (playerUuid === this._createdBy && this._players.length > 1) {
        return Result.fail('Creator cannot leave lobby while other players are present')
      }

      const removedPlayer = this._players[playerIndex]
      this._players.splice(playerIndex, 1)

      // Si le créateur quitte, transférer la propriété
      if (playerUuid === this._createdBy && this._players.length > 0) {
        this._createdBy = this._players[0].uuid
      }

      // Événement domaine
      this.recordEvent(
        new PlayerLeftLobbyEvent(this._uuid, removedPlayer, this._players.length, this.status)
      )

      return Result.ok(undefined)
    } catch (error) {
      return Result.fail('Failed to remove player from lobby')
    }
  }

  startGame(): Result<string> {
    try {
      if (!this.canStart) {
        return Result.fail('Lobby must be READY or FULL to start game')
      }

      // Mise à jour du statut
      this._status = LobbyStatus.STARTING

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

      return Result.ok(gameUuid)
    } catch (error) {
      return Result.fail('Failed to start game')
    }
  }

  setReady(): Result<void> {
    try {
      if (this._players.length < 2) {
        return Result.fail('Need at least 2 players to be ready')
      }

      this._status = LobbyStatus.READY
      return Result.ok(undefined)
    } catch (error) {
      return Result.fail('Failed to set lobby ready')
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
      throw new LobbyValidationException('Player is already in the lobby')
    }

    if (this.isFull()) {
      throw new LobbyValidationException('Lobby is full')
    }

    if (!this.isOpen) {
      throw new LobbyValidationException('Lobby is not accepting new players')
    }
  }

  private updateStatusBasedOnPlayerCount(): void {
    const playerCount = this._players.length

    if (playerCount === 0) {
      this._status = LobbyStatus.OPEN
    } else if (playerCount === 1) {
      this._status = LobbyStatus.WAITING
    } else if (playerCount === 2) {
      this._status = LobbyStatus.READY
    } else if (playerCount >= this._maxPlayers) {
      this._status = LobbyStatus.FULL
    } else {
      // Entre 3 et maxPlayers-1 : reste READY
      this._status = LobbyStatus.READY
    }
  }

  // Validation methods
  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new LobbyValidationException('Lobby name cannot be empty', 'name')
    }
    if (name.trim().length < 3 || name.trim().length > 50) {
      throw new LobbyValidationException('Lobby name must be between 3 and 50 characters', 'name')
    }
  }

  private static validateMaxPlayers(maxPlayers: number): void {
    if (maxPlayers < 2 || maxPlayers > 8) {
      throw new LobbyValidationException('Max players must be between 2 and 8', 'maxPlayers')
    }
  }

  // Serialization
  serialize() {
    return {
      uuid: this._uuid,
      name: this._name,
      creator: this.creator,
      players: this._players,
      maxPlayers: this._maxPlayers,
      currentPlayers: this._players.length,
      isPrivate: this._isPrivate,
      status: this.status,
      hasAvailableSlots: this.hasAvailableSlots,
      canStart: this.canStart,
      availableActions: this.availableActions,
      createdBy: this._createdBy,
      createdAt: this._createdAt,
    }
  }

  toJSON() {
    return this.serialize()
  }
}
