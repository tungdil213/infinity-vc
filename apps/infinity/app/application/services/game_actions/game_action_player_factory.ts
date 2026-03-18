import Player from '#domain/entities/player'

type UserLike = {
  uuid: string
  fullName: string | null
  email?: string
}

type GamePlayerLike = {
  uuid: string
  nickName: string
}

export class GameActionPlayerFactory {
  fromUser(user: UserLike): Player {
    return Player.create({
      userUuid: user.uuid,
      nickName: user.fullName ?? user.email ?? 'Player',
    })
  }

  fromGamePlayer(player: GamePlayerLike | null | undefined): Player | undefined {
    if (!player) {
      return undefined
    }

    return Player.create({
      userUuid: player.uuid,
      nickName: player.nickName,
    })
  }

  fromGamePlayerOrNull(player: GamePlayerLike | null | undefined): Player | null {
    return this.fromGamePlayer(player) ?? null
  }

  fromGamePlayers(players: GamePlayerLike[]): Player[] {
    return players.map((player) =>
      Player.create({
        userUuid: player.uuid,
        nickName: player.nickName,
      })
    )
  }
}
