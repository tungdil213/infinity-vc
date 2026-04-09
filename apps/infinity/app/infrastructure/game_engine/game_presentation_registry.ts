import type { GamePresentationDefinition } from '@infinity.dev/game-engine'
import { defaultGameCatalog } from '#infrastructure/game_engine/launcher_game_catalog'

export interface ResolvedGamePresentationConfig {
  displayName?: string
  presentation?: GamePresentationDefinition
}

const LEGACY_GAME_PRESENTATIONS = new Map<string, ResolvedGamePresentationConfig>([
  [
    'love-letter',
    {
      displayName: 'Love Letter Infinity Gauntlet',
      presentation: {
        playerView: 'hidden-hand-player-list',
        rendererKind: 'turn-based-card-hand',
        pollingIntervalMs: 5000,
        showReplayDiff: true,
        rendererOptions: {
          sections: {
            players: 'Players',
            hand: 'Your Hand',
            actions: 'Actions',
            replay: 'Replay Timeline',
            spectator: 'Spectator View',
            guess: 'Guess a Card',
          },
          summary: {
            roundResult: 'Round Result',
          },
        },
      },
    },
  ],
])

export function resolveGamePresentation(
  gameType: string | undefined
): GamePresentationDefinition | undefined {
  return resolveGamePresentationConfig(gameType)?.presentation
}

export function resolveGameDisplayName(gameType: string | undefined): string | undefined {
  return resolveGamePresentationConfig(gameType)?.displayName
}

export function resolveGamePresentationConfig(
  gameType: string | undefined
): ResolvedGamePresentationConfig | undefined {
  if (!gameType) {
    return undefined
  }

  const gameDefinition = defaultGameCatalog.findGameDefinition(gameType)
  if (gameDefinition) {
    return {
      displayName: gameDefinition.displayName,
      presentation: gameDefinition.presentation,
    }
  }

  return LEGACY_GAME_PRESENTATIONS.get(gameType)
}
