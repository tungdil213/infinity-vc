import type {
  GameRendererOptions,
  RendererKind,
  RendererOptionsByKind,
  SimultaneousChoiceRendererOptions,
  TurnBasedCardHandRendererOptions,
} from '@infinity.dev/game-engine'
import type { FrontendGameRendererDefinition } from './game_renderer_types.js'
import { SimultaneousChoiceRenderer } from './renderers/simultaneous_choice_renderer.js'
import { TurnBasedCardHandRenderer } from './renderers/turn_based_card_hand_renderer.js'

export const gameRendererRegistry: Record<RendererKind, FrontendGameRendererDefinition> = {
  'simultaneous-choice': {
    kind: 'simultaneous-choice',
    pollingIntervalMs: 3000,
    Component: SimultaneousChoiceRenderer,
  },
  'turn-based-card-hand': {
    kind: 'turn-based-card-hand',
    pollingIntervalMs: 5000,
    Component: TurnBasedCardHandRenderer,
  },
}

const LEGACY_RENDERER_KIND_BY_GAME_TYPE = new Map<string, RendererKind>([
  ['rock-paper-scissors', 'simultaneous-choice'],
  ['love-letter', 'turn-based-card-hand'],
  ['love-letter-infinity-gauntlet', 'turn-based-card-hand'],
])

const DEFAULT_RENDERER_OPTIONS_BY_KIND: RendererOptionsByKind = {
  'simultaneous-choice': {
    sections: {
      players: 'Players & Scores',
      actions: 'Actions',
      history: 'Rounds History',
      replay: 'Replay Timeline',
    },
    summary: {
      finalScore: 'Final Score',
      roundsRecap: 'Rounds Recap',
    },
  },
  'turn-based-card-hand': {
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
}

export function resolveRendererKind(args: {
  rendererKind?: RendererKind | null
  gameType?: string
}): RendererKind | undefined {
  const { rendererKind, gameType } = args

  if (rendererKind) {
    return rendererKind
  }

  if (!gameType) {
    return undefined
  }

  return LEGACY_RENDERER_KIND_BY_GAME_TYPE.get(gameType)
}

export function resolveGameRenderer(args: {
  rendererKind?: RendererKind | null
  gameType?: string
}): FrontendGameRendererDefinition | undefined {
  const resolvedRendererKind = resolveRendererKind(args)

  if (!resolvedRendererKind) {
    return undefined
  }

  return gameRendererRegistry[resolvedRendererKind]
}

export function resolveRendererOptions(args: {
  rendererKind?: RendererKind | null
  gameType?: string
  rendererOptions?: GameRendererOptions | null
}): GameRendererOptions | undefined {
  const resolvedRendererKind = resolveRendererKind(args)

  if (!resolvedRendererKind) {
    return undefined
  }

  switch (resolvedRendererKind) {
    case 'simultaneous-choice':
      return mergeSimultaneousChoiceRendererOptions(
        DEFAULT_RENDERER_OPTIONS_BY_KIND['simultaneous-choice'],
        args.rendererOptions as SimultaneousChoiceRendererOptions | null | undefined
      )
    case 'turn-based-card-hand':
      return mergeTurnBasedCardHandRendererOptions(
        DEFAULT_RENDERER_OPTIONS_BY_KIND['turn-based-card-hand'],
        args.rendererOptions as TurnBasedCardHandRendererOptions | null | undefined
      )
  }
}

export function formatGameTitle(gameType: string): string {
  return gameType
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function mergeSimultaneousChoiceRendererOptions(
  defaults: SimultaneousChoiceRendererOptions,
  overrides?: SimultaneousChoiceRendererOptions | null
): SimultaneousChoiceRendererOptions {
  return {
    ...defaults,
    ...overrides,
    sections: {
      ...defaults.sections,
      ...overrides?.sections,
    },
    summary: {
      ...defaults.summary,
      ...overrides?.summary,
    },
  }
}

function mergeTurnBasedCardHandRendererOptions(
  defaults: TurnBasedCardHandRendererOptions,
  overrides?: TurnBasedCardHandRendererOptions | null
): TurnBasedCardHandRendererOptions {
  return {
    ...defaults,
    ...overrides,
    sections: {
      ...defaults.sections,
      ...overrides?.sections,
    },
    summary: {
      ...defaults.summary,
      ...overrides?.summary,
    },
  }
}
