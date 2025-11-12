import type { User } from '../../domains/iam/domain/entities/user.entity.js'
import { Player } from '../../domains/lobby/domain/entities/player.entity.js'
import { Result } from '#shared_kernel/domain/result'

/**
 * Anti-Corruption Layer: IAM → Lobby
 * Mappe User (IAM) vers Player (Lobby)
 */
export class UserToPlayerMapper {
  public static toPlayer(user: User, lobbyId: string, isOwner: boolean = false): Result<Player> {
    return Player.create({
      userId: user.id,
      username: user.username.value,
      lobbyId,
      isOwner,
    })
  }

  public static toPlayersList(users: User[], lobbyId: string): Result<Player[]> {
    const players: Player[] = []

    for (const user of users) {
      const playerResult = this.toPlayer(user, lobbyId)
      if (playerResult.isFailure) {
        return Result.fail(playerResult.error)
      }
      players.push(playerResult.value)
    }

    return Result.ok(players)
  }
}
