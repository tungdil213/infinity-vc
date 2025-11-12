import { BaseAggregateRoot } from '#shared_kernel/domain/base_aggregate_root'
import { Result } from '#shared_kernel/domain/result'
import type { Lobby } from '../entities/lobby.entity.js'
import type { Player } from '../entities/player.entity.js'
import { LobbyStatus } from '../value_objects/lobby_status.vo.js'
import { LobbyCreatedEvent } from '../events/lobby_created.event.js'
import { PlayerJoinedEvent } from '../events/player_joined.event.js'
import { PlayerLeftEvent } from '../events/player_left.event.js'
import { GameStartedEvent } from '../events/game_started.event.js'

/**
 * Lobby Aggregate Root
 * Consistency boundary: Lobby + Players
 * Toutes les modifications passent par cet aggregate
 */
export class LobbyAggregate extends BaseAggregateRoot {
  private lobby: Lobby
  private players: Map<string, Player> = new Map()

  private constructor(lobby: Lobby, players: Player[] = []) {
    super(lobby.id)
    this.lobby = lobby
    players.forEach((player) => this.players.set(player.userId, player))
  }

  get id(): string {
    return this.lobby.id
  }

  get lobbyEntity(): Lobby {
    return this.lobby
  }

  get playersList(): Player[] {
    return Array.from(this.players.values())
  }

  public static create(lobby: Lobby, players: Player[] = []): LobbyAggregate {
    const aggregate = new LobbyAggregate(lobby, players)
    
    // Create event with full lobby data for frontend
    aggregate.addDomainEvent(
      new LobbyCreatedEvent({
        uuid: lobby.id,
        name: lobby.settings.name,
        status: lobby.status,
        currentPlayers: players.length,
        maxPlayers: lobby.settings.maxPlayers,
        minPlayers: lobby.settings.minPlayers,
        isPrivate: lobby.settings.isPrivate,
        gameType: lobby.settings.gameType,
        ownerId: lobby.ownerId,
        players: players.map((p) => ({
          uuid: p.userId,
          nickName: p.username,
          isReady: p.isReady,
          isOwner: p.isOwner,
        })),
      })
    )
    
    return aggregate
  }

  public addPlayer(player: Player): Result<void> {
    if (this.players.has(player.userId)) {
      return Result.fail('Player already in lobby')
    }

    if (this.lobby.isFull) {
      return Result.fail('Lobby is full')
    }

    const incrementResult = this.lobby.incrementPlayers()
    if (incrementResult.isFailure) {
      return incrementResult
    }

    this.players.set(player.userId, player)
    
    // Create event with full data for frontend
    const allPlayers = Array.from(this.players.values())
    this.addDomainEvent(
      new PlayerJoinedEvent({
        lobbyUuid: this.lobby.id,
        player: {
          uuid: player.userId,
          nickName: player.username,
          isReady: player.isReady,
          isOwner: player.isOwner,
        },
        playerCount: allPlayers.length,
        lobby: {
          uuid: this.lobby.id,
          name: this.lobby.settings.name,
          status: this.lobby.status,
          currentPlayers: allPlayers.length,
          maxPlayers: this.lobby.settings.maxPlayers,
          players: allPlayers.map((p) => ({
            uuid: p.userId,
            nickName: p.username,
            isReady: p.isReady,
            isOwner: p.isOwner,
          })),
        },
      })
    )

    return Result.ok()
  }

  public removePlayer(userId: string): Result<void> {
    const player = this.players.get(userId)
    if (!player) {
      return Result.fail('Player not found in lobby')
    }

    const decrementResult = this.lobby.decrementPlayers()
    if (decrementResult.isFailure) {
      return decrementResult
    }

    // Store player data before deletion
    const leftPlayer = player
    
    this.players.delete(userId)
    
    // Create event with full data for frontend
    const remainingPlayers = Array.from(this.players.values())
    this.addDomainEvent(
      new PlayerLeftEvent({
        lobbyUuid: this.lobby.id,
        player: {
          uuid: leftPlayer.userId,
          nickName: leftPlayer.username,
          isReady: leftPlayer.isReady,
          isOwner: leftPlayer.isOwner,
        },
        playerCount: remainingPlayers.length,
        lobby: {
          uuid: this.lobby.id,
          name: this.lobby.settings.name,
          status: this.lobby.status,
          currentPlayers: remainingPlayers.length,
          maxPlayers: this.lobby.settings.maxPlayers,
          players: remainingPlayers.map((p) => ({
            uuid: p.userId,
            nickName: p.username,
            isReady: p.isReady,
            isOwner: p.isOwner,
          })),
        },
      })
    )

    return Result.ok()
  }

  public togglePlayerReady(userId: string): Result<void> {
    const player = this.players.get(userId)
    if (!player) {
      return Result.fail('Player not found in lobby')
    }

    return player.toggleReady()
  }

  public startGame(gameId: string): Result<void> {
    if (!this.lobby.canStart) {
      return Result.fail('Not enough players to start game')
    }

    const allReady = this.areAllPlayersReady()
    if (!allReady) {
      return Result.fail('Not all players are ready')
    }

    const startResult = this.lobby.startGame(gameId)
    if (startResult.isFailure) {
      return startResult
    }

    this.addDomainEvent(
      new GameStartedEvent(
        this.lobby.id,
        gameId,
        this.playersList.map((p) => p.userId)
      )
    )

    return Result.ok()
  }

  public changeStatus(newStatus: LobbyStatus): Result<void> {
    return this.lobby.changeStatus(newStatus)
  }

  private areAllPlayersReady(): boolean {
    return this.playersList.every((player) => player.isReady || player.isOwner)
  }

  public getPlayer(userId: string): Player | undefined {
    return this.players.get(userId)
  }

  public isOwner(userId: string): boolean {
    return this.lobby.ownerId === userId
  }
}
