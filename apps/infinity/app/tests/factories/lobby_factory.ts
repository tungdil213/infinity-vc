import Lobby from '../../domain/entities/lobby.js'
import { PlayerInterface } from '../../domain/interfaces/player_interface.js'
import { PlayerFactory } from './player_factory.js'

export class LobbyFactory {
  static create(
    overrides: Partial<{
      uuid: string
      name: string
      creator: PlayerInterface
      maxPlayers: number
      isPrivate: boolean
    }> = {}
  ): Lobby {
    const defaults = {
      name: `Lobby ${Date.now()}`,
      creator: PlayerFactory.createPlayerInterface(),
      maxPlayers: 4,
      isPrivate: false,
    }

    return Lobby.create({ ...defaults, ...overrides })
  }

  static createWithPlayers(playerCount: number, overrides: any = {}): Lobby {
    const players = PlayerFactory.createPlayerInterfaces(playerCount)
    const lobby = this.create({
      ...overrides,
      creator: players[0],
    })

    // Ajouter les autres joueurs
    for (let i = 1; i < playerCount; i++) {
      lobby.addPlayer(players[i])
    }

    return lobby
  }

  static createMany(count: number, overrides: any = {}): Lobby[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({
        ...overrides,
        name: `Lobby ${Date.now()}_${index}`,
      })
    )
  }
}
