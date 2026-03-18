import type Player from '#domain/entities/player'
import type Game from '#domain/entities/game'
import type {
  CardEffectResult,
  GameActionCard,
} from '#application/services/game_actions/game_action_contracts'

export class LoveLetterCardEffectService {
  applyCardEffect(
    game: Game,
    player: Player,
    card: GameActionCard,
    targetPlayerUuid?: string
  ): CardEffectResult {
    switch (card.name) {
      case 'Baron':
        return this.handleBaron(game, player, targetPlayerUuid)
      case 'Prince':
        return this.handlePrince(game, targetPlayerUuid)
      case 'King':
        this.handleKing(game, player, targetPlayerUuid)
        return { eliminated: false }
      case 'Princess':
        return { eliminated: true, eliminatedPlayer: player.uuid }
      case 'Guard':
      case 'Priest':
      case 'Handmaid':
      case 'Countess':
      default:
        return { eliminated: false }
    }
  }

  private handleBaron(game: Game, player: Player, targetPlayerUuid?: string): CardEffectResult {
    if (!targetPlayerUuid) {
      return { eliminated: false }
    }

    const playerHand = this.getPlayerHand(game, player.uuid)
    const targetHand = this.getPlayerHand(game, targetPlayerUuid)
    if (playerHand.length === 0 || targetHand.length === 0) {
      return { eliminated: false }
    }

    const playerCard = playerHand[0]
    const targetCard = targetHand[0]
    if (playerCard.value < targetCard.value) {
      return { eliminated: true, eliminatedPlayer: player.uuid }
    }

    if (targetCard.value < playerCard.value) {
      return { eliminated: true, eliminatedPlayer: targetPlayerUuid }
    }

    return { eliminated: false }
  }

  private handlePrince(game: Game, targetPlayerUuid?: string): CardEffectResult {
    if (!targetPlayerUuid) {
      return { eliminated: false }
    }

    const targetHand = this.getPlayerHand(game, targetPlayerUuid)
    if (targetHand.length === 0) {
      return { eliminated: false }
    }

    const discardedCard = targetHand.pop()
    if (discardedCard) {
      game.gameData.discardPile.push(discardedCard)
      if (discardedCard.name === 'Princess') {
        return { eliminated: true, eliminatedPlayer: targetPlayerUuid }
      }
    }

    return { eliminated: false }
  }

  private handleKing(game: Game, player: Player, targetPlayerUuid?: string): void {
    if (!targetPlayerUuid) {
      return
    }

    const playerHand = this.getPlayerHand(game, player.uuid)
    const targetHand = this.getPlayerHand(game, targetPlayerUuid)
    if (playerHand.length === 0 || targetHand.length === 0) {
      return
    }

    const temp = playerHand[0]
    playerHand[0] = targetHand[0]
    targetHand[0] = temp
  }

  private getPlayerHand(game: Game, playerUuid: string): GameActionCard[] {
    return (game.gameData.playerHands[playerUuid] as GameActionCard[]) || []
  }
}
