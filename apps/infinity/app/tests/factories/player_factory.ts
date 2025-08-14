import Player from '../../domain/entities/player.js'
import { PlayerInterface } from '../../domain/interfaces/player_interface.js'

export class PlayerFactory {
  static create(
    overrides: Partial<{
      userUuid: string
      nickName: string
      gamesPlayed: number
      gamesWon: number
    }> = {}
  ): Player {
    const defaults = {
      userUuid: crypto.randomUUID(),
      nickName: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      gamesPlayed: 0,
      gamesWon: 0,
    }

    return Player.create({ ...defaults, ...overrides })
  }

  static createMany(count: number, overrides: any = {}): Player[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({
        ...overrides,
        userUuid: crypto.randomUUID(),
        nickName: `player_${Date.now()}_${index}`,
      })
    )
  }

  static createPlayerInterface(overrides: Partial<PlayerInterface> = {}): PlayerInterface {
    const defaults = {
      uuid: crypto.randomUUID(),
      nickName: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }

    return { ...defaults, ...overrides }
  }

  static createPlayerInterfaces(count: number): PlayerInterface[] {
    return Array.from({ length: count }, (_, index) =>
      this.createPlayerInterface({
        uuid: crypto.randomUUID(),
        nickName: `player_${Date.now()}_${index}`,
      })
    )
  }
}
