import type { GamePresentationDefinition } from '@infinity.dev/game-engine'
import { defaultGameCatalog } from '#infrastructure/game_engine/launcher_game_catalog'

const LEGACY_GAME_PRESENTATIONS = new Map<string, GamePresentationDefinition>([
  [
    'love-letter',
    {
      playerView: 'hidden-hand-player-list',
    },
  ],
])

export function resolveGamePresentation(
  gameType: string | undefined
): GamePresentationDefinition | undefined {
  if (!gameType) {
    return undefined
  }

  return (
    defaultGameCatalog.findGameDefinition(gameType)?.presentation ??
    LEGACY_GAME_PRESENTATIONS.get(gameType)
  )
}
